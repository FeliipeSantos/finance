import uuid

import pytest
import xlrd


def create_tx(api, token, **overrides):
    response = api.post('/transactions', token=token, json={
        'description': 'Compra', 'type': 'EXPENSE', 'value': 50.25,
        'date': '2026-09-09', 'dueDate': '2026-10-01', 'effective': False,
        **overrides,
    })
    assert response.status_code == 200, response.text
    return response.json()


def test_xls_exports_only_selected_rows_with_native_values(api, register_user, account_factory):
    token = register_user()['token']
    account = account_factory(token)
    card_response = api.post('/cards', token=token, json={
        'name': 'Cartão teste', 'brand': 'VISA', 'limitTotal': 2000,
        'closingDay': 1, 'dueDay': 10, 'accountId': account['id'],
    })
    assert card_response.status_code == 200, card_response.text
    first = create_tx(api, token, description='=1+1', creditCardId=card_response.json()['id'])
    second = create_tx(api, token, description='Ação e salário', type='REVENUE', value=1234.56,
                       effective=True, effectiveDate='2026-09-10', accountId=account['id'])
    create_tx(api, token, description='Não selecionada')
    response = api.post('/reports/export/xls', token=token, json={
        'transactionIds': [second['id'], first['id'], first['id']],
    })
    assert response.status_code == 200, response.text
    assert response.headers['content-type'] == 'application/vnd.ms-excel'
    assert 'transacoes.xls' in response.headers['content-disposition']
    assert response.content.startswith(bytes.fromhex('D0CF11E0A1B11AE1'))
    book = xlrd.open_workbook(file_contents=response.content, formatting_info=True)
    sheet = book.sheet_by_index(0)
    assert sheet.name == 'Transações'
    assert sheet.nrows == 3
    assert sheet.row_values(0) == [
        'Descrição', 'Valor', 'Situação', 'Categoria', 'Subcategoria',
        'Lançamento', 'Vencimento', 'Efetivação', 'Recorrência', 'Conta',
        'Tags', 'Observações',
    ]
    assert sheet.cell_value(1, 0) == 'Ação e salário'
    assert sheet.cell_value(1, 1) == 1234.56
    assert sheet.cell_type(1, 1) == xlrd.XL_CELL_NUMBER
    for col in (5, 6, 7):
        assert sheet.cell_type(1, col) == xlrd.XL_CELL_DATE
        date_format = book.xf_list[sheet.cell_xf_index(1, col)].format_key
        assert book.format_map[date_format].format_str == 'DD/MM/YYYY'
    assert xlrd.xldate_as_datetime(sheet.cell_value(1, 7), book.datemode).strftime('%Y-%m-%d') == '2026-09-10'
    assert sheet.cell_value(2, 0) == '=1+1'
    assert sheet.cell_type(2, 0) == xlrd.XL_CELL_TEXT
    assert sheet.cell_value(2, 9) == account['name']
    assert sheet.cell_value(2, 2) == 'Pendente'
    assert sheet.cell_value(2, 7) == ''
    assert sheet.cell_value(2, 8) == 'N'
    assert sheet.cell_value(2, 10) == sheet.cell_value(2, 11) == ''
    header_format = book.xf_list[sheet.cell_xf_index(0, 0)]
    header_font = book.font_list[header_format.font_index]
    assert header_font.bold and header_font.name == 'Calibri'
    assert book.colour_map[header_font.colour_index] == (0, 0, 0)
    assert header_format.background.fill_pattern == 0
    assert header_format.border.bottom_line_style == 1
    number_format = book.xf_list[sheet.cell_xf_index(1, 1)].format_key
    assert book.format_map[number_format].format_str == 'General'


@pytest.mark.parametrize('recurrence,code', [('NP', 'N'), ('PARCELADA', 'P'), ('FIXA', 'F')])
def test_export_recurrence_categories_tags_and_notes(api, register_user, recurrence, code):
    token = register_user()['token']
    parent = api.post('/categories', token=token, json={'name': 'Pagamentos', 'type': 'REVENUE'})
    assert parent.status_code == 200, parent.text
    child = api.post('/categories', token=token, json={
        'name': 'Reembolsos', 'type': 'REVENUE', 'parentCategoryId': parent.json()['id'],
    })
    assert child.status_code == 200, child.text
    tx = create_tx(api, token, type='REVENUE', description='Empréstimo - João',
                   categoryId=child.json()['id'], recurrenceType=recurrence,
                   installmentsCount=12, startInstallment=10, valueType='parcela',
                   tags='família, reembolso', notes='=Observação literal')
    response = api.post('/reports/export/xls', token=token, json={'transactionIds': [tx['id']]})
    assert response.status_code == 200, response.text
    sheet = xlrd.open_workbook(file_contents=response.content).sheet_by_index(0)
    assert sheet.name == 'Receitas'
    assert sheet.nrows == 2
    assert sheet.cell_value(1, 0) == tx['description']
    if recurrence == 'PARCELADA':
        assert sheet.cell_value(1, 0).endswith('10/12')
    assert sheet.row_values(1)[3:5] == ['Pagamentos', 'Reembolsos']
    assert sheet.cell_value(1, 8) == code
    assert sheet.cell_value(1, 9) == ''
    assert sheet.cell_value(1, 10) == 'família, reembolso'
    assert sheet.cell_value(1, 11) == '=Observação literal'
    assert sheet.cell_type(1, 11) == xlrd.XL_CELL_TEXT


@pytest.mark.parametrize('tx_type,sheet_name', [('EXPENSE', 'Despesas'), ('TRANSFER', 'Transferências')])
def test_export_single_type_names_and_optional_fields(api, register_user, tx_type, sheet_name):
    token = register_user()['token']
    tx = create_tx(api, token, type=tx_type, dueDate=None, value=0)
    response = api.post('/reports/export/xls', token=token, json={'transactionIds': [tx['id']]})
    assert response.status_code == 200, response.text
    sheet = xlrd.open_workbook(file_contents=response.content).sheet_by_index(0)
    assert sheet.name == sheet_name
    assert sheet.cell_value(1, 1) == 0
    assert sheet.row_values(1)[3:5] == ['', '']
    assert sheet.row_values(1)[6:8] == ['', '']


def test_export_rejects_foreign_or_missing_rows_without_partial_file(api, register_user):
    owner = register_user()['token']
    other = register_user()['token']
    own = create_tx(api, owner)
    foreign = create_tx(api, other)
    for transaction_id in [foreign['id'], str(uuid.uuid4())]:
        response = api.post('/reports/export/xls', token=owner, json={
            'transactionIds': [own['id'], transaction_id],
        })
        assert response.status_code == 404


def test_export_requires_auth_and_nonempty_selection(api, register_user):
    response = api.post('/reports/export/xls', json={'transactionIds': [str(uuid.uuid4())]})
    assert response.status_code in (401, 403)
    response = api.post('/reports/export/xls', token=register_user()['token'], json={'transactionIds': []})
    assert response.status_code == 422
