from uuid import UUID
from datetime import datetime
from app.schemas.base import CamelModel, Decimal
from pydantic import Field

class BudgetRequest(CamelModel):
    category_id: UUID
    category_ids: list[UUID] | None = None
    limit_value: Decimal
    month: int
    year: int
    name: str | None = None
    color: str | None = None
    icon: str | None = None
    settings: dict = Field(default_factory=dict)

class BudgetReorderRequest(CamelModel):
    budget_ids: list[UUID]

class BudgetResponse(CamelModel):
    id: UUID
    category_id: UUID
    category_ids: list[UUID] = Field(default_factory=list)
    category_name: str
    limit_value: Decimal
    current_value: Decimal
    month: int
    year: int
    name: str | None = None
    color: str | None = None
    icon: str | None = None
    settings: dict = Field(default_factory=dict)
    display_order: int = 0
    created_at: datetime
    updated_at: datetime
