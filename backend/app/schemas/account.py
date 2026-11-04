from uuid import UUID
from datetime import datetime
from typing import Optional
from app.schemas.base import CamelModel, Decimal

class AccountRequest(CamelModel):
    name: str
    institution: Optional[str] = None
    balance_initial: Decimal
    color: str
    type: str  # CHECKING, SAVINGS, etc.
    overdraft: Decimal = Decimal("0.00")
    account_number: Optional[str] = None
    additional_data: Optional[str] = None
    is_default: bool = False
    show_in_resume: bool = True
    is_investment: bool = False
    ignore_in_totals: bool = False
    account_group: Optional[str] = "Nenhum"
    icon: Optional[str] = "bank"
    custom_icon_url: Optional[str] = None

class AccountResponse(CamelModel):
    id: UUID
    name: str
    institution: Optional[str]
    balance_initial: Decimal
    balance_current: Decimal
    color: str
    type: str
    is_active: bool
    overdraft: Decimal
    account_number: Optional[str]
    additional_data: Optional[str]
    is_default: bool
    show_in_resume: bool
    is_investment: bool
    ignore_in_totals: bool
    account_group: Optional[str]
    icon: Optional[str]
    custom_icon_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
