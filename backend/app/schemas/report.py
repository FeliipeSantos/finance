from typing import List
from uuid import UUID
from pydantic import Field
from app.schemas.base import CamelModel, Decimal

class TransactionsXlsRequest(CamelModel):
    transaction_ids: List[UUID] = Field(min_length=1, max_length=65535)

class CategoryReportItem(CamelModel):
    category_name: str
    value: Decimal
    color: str
    percentage: Decimal

class AccountReportItem(CamelModel):
    account_name: str
    balance: Decimal
    color: str

class CashFlowReportItem(CamelModel):
    month: str
    revenues: Decimal
    expenses: Decimal
    balance: Decimal

class InvestmentReportItem(CamelModel):
    investment_name: str
    type: str
    quantity: Decimal
    average_price: Decimal
    cost_value: Decimal
    current_value: Decimal
    profitability: Decimal
    profitability_percentage: Decimal

class DashboardReportResponse(CamelModel):
    total_balance: Decimal
    total_invested: Decimal
    total_net_worth: Decimal
    monthly_revenues: Decimal
    monthly_expenses: Decimal
    monthly_savings: Decimal
    expenses_by_category: List[CategoryReportItem]
    balance_by_account: List[AccountReportItem]
    cash_flow: List[CashFlowReportItem]
    investments: List[InvestmentReportItem]
