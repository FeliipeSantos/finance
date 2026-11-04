from uuid import UUID
from datetime import datetime
from typing import List, Optional
from app.schemas.base import CamelModel

class CategoryRequest(CamelModel):
    name: str
    type: str  # REVENUE, EXPENSE, ACCOUNTS
    parent_category_id: Optional[UUID] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    display_order: int = 0
    show_in_accounts_by_category: bool = True
    show_in_category_summary: bool = True
    show_in_category_balance: bool = True

class CategoryResponse(CamelModel):
    id: UUID
    user_id: Optional[UUID] = None
    name: str
    type: str
    parent_category_id: Optional[UUID] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    display_order: int
    show_in_accounts_by_category: bool
    show_in_category_summary: bool
    show_in_category_balance: bool
    created_at: datetime
    updated_at: datetime

class CategoryReorderRequest(CamelModel):
    category_ids: List[UUID]
