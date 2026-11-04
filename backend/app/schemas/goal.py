from uuid import UUID
from datetime import datetime, date
from typing import Optional
from app.schemas.base import CamelModel, Decimal

class GoalRequest(CamelModel):
    name: str
    description: Optional[str] = None
    target_value: Decimal
    current_value: Decimal
    deadline: Optional[date] = None
    status: str  # ACTIVE, COMPLETED, ABANDONED

class GoalResponse(CamelModel):
    id: UUID
    name: str
    description: Optional[str] = None
    target_value: Decimal
    current_value: Decimal
    deadline: Optional[date] = None
    status: str
    created_at: datetime
    updated_at: datetime
