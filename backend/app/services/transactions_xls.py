from io import BytesIO
import re

import xlwt
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.models import Account, Category, CreditCard, Transaction


def recurrence_code(tx: Transaction) -> str:
    # Recurrence is currently stored as a series ID and a description suffix,
    # including legacy rows that predate series IDs.
    description = (tx.description or "").rstrip()
    if description.endswith("[Fixa]"):
        return "F"
    if tx.recurrence_group_id or re.search(r"\s\d+/\d+$", description):
        return "P"
    return "N"


def export_transactions_xls(db: Session, user_id, transaction_ids) -> bytes:
    # The UI sends every matching ID, before pagination and card grouping.
    ids = list(dict.fromkeys(transaction_ids))
    transactions = {}
    for start in range(0, len(ids), 500):
        rows = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.id.in_(ids[start:start + 500]),
        ).all()
        transactions.update({row.id: row for row in rows})
    if len(transactions) != len(ids):
        raise HTTPException(status_code=404, detail="Um ou mais lançamentos não estão disponíveis. Atualize a lista e tente novamente.")

    accounts = {a.id: a for a in db.query(Account).filter(Account.user_id == user_id).all()}
    cards = {c.id: c for c in db.query(CreditCard).filter(CreditCard.user_id == user_id).all()}
    categories = {c.id: c for c in db.query(Category).filter(
        (Category.user_id == user_id) | (Category.user_id.is_(None))
    ).all()}

    workbook = xlwt.Workbook(encoding="utf-8")
    types = {tx.type for tx in transactions.values()}
    sheet_name = {"EXPENSE": "Despesas", "REVENUE": "Receitas", "TRANSFER": "Transferências"}.get(
        next(iter(types)) if len(types) == 1 else None, "Transações"
    )
    sheet = workbook.add_sheet(sheet_name)
    sheet.set_panes_frozen(True)
    sheet.set_horz_split_pos(1)
    base_style = "font: name Calibri, height 220, colour black; alignment: vert centre;"
    header = xlwt.easyxf(base_style + "font: bold on; borders: left thin, right thin, top thin, bottom thin;")
    text_style = xlwt.easyxf(base_style)
    date_style = xlwt.easyxf(base_style + "alignment: horiz left;", num_format_str="DD/MM/YYYY")
    money_style = xlwt.easyxf(base_style + "alignment: horiz right;", num_format_str="General")
    columns = ["Descrição", "Valor", "Situação", "Categoria", "Subcategoria", "Lançamento", "Vencimento", "Efetivação", "Recorrência", "Conta", "Tags", "Observações"]
    widths = [46, 16, 16, 16, 16, 16, 16, 16, 16, 16, 38, 46]
    for col, label in enumerate(columns):
        sheet.write(0, col, label, header)
        sheet.col(col).width = widths[col] * 256
    sheet.row(0).height_mismatch = True
    sheet.row(0).height = 300

    for row_number, transaction_id in enumerate(ids, 1):
        tx = transactions[transaction_id]
        card = cards.get(tx.credit_card_id)
        account = accounts.get((card.account_id if card else None) or tx.account_id)
        category = categories.get(tx.category_id)
        parent = categories.get(category.parent_category_id) if category and category.parent_category_id else None
        values = [
            tx.description or "", float(tx.value or 0),
            "Efetivada" if tx.effective else "Pendente",
            parent.name if parent else (category.name if category else ""),
            category.name if parent else "", tx.date, tx.due_date,
            tx.effective_date if tx.effective else None, recurrence_code(tx),
            account.name if account else "", tx.tags or "", tx.notes or "",
        ]
        sheet.row(row_number).height_mismatch = True
        sheet.row(row_number).height = 300
        for col, value in enumerate(values):
            style = date_style if col in (5, 6, 7) else money_style if col == 1 else text_style
            # xlwt writes strings literally, including descriptions starting '='.
            sheet.write(row_number, col, value, style)
    output = BytesIO()
    workbook.save(output)
    return output.getvalue()
