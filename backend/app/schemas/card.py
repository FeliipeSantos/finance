from uuid import UUID
from datetime import datetime
from app.schemas.base import CamelModel, Decimal

class CreditCardRequest(CamelModel):
    name: str
    bank: str | None = None
    brand: str
    limit_total: Decimal
    closing_day: int
    due_day: int
    color: str | None = "#3B82F6"
    initial_invoice: Decimal | None = Decimal("0.00")
    account_id: UUID | None = None
    is_main: bool = False
    dynamic_closing: bool = False
    due_business_days: bool = False
    custom_icon_url: str | None = None

class CreditCardResponse(CamelModel):
    id: UUID
    name: str
    bank: str | None = None
    brand: str
    limit_total: Decimal
    limit_used: Decimal
    limit_available: Decimal
    closing_day: int
    due_day: int
    color: str | None = "#3B82F6"
    initial_invoice: Decimal | None = Decimal("0.00")
    account_id: UUID | None = None
    is_main: bool = False
    dynamic_closing: bool = False
    due_business_days: bool = False
    custom_icon_url: str | None = None
    created_at: datetime
    updated_at: datetime
