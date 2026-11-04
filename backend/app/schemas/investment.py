from uuid import UUID
from datetime import datetime, date
from typing import Optional, List
from app.schemas.base import CamelModel, Decimal

class InvestmentMovementRequest(CamelModel):
    type: str  # BUY, SELL, DIVIDEND
    quantity: Decimal
    price: Decimal
    date: date

class InvestmentMovementResponse(CamelModel):
    id: UUID
    investment_id: UUID
    type: str
    quantity: Decimal
    price: Decimal
    date: date
    created_at: datetime

class InvestmentRequest(CamelModel):
    name: str
    type: str  # TESOURO_DIRETO, CDB, etc.
    average_price: Decimal
    quantity: Decimal
    current_value: Decimal

class InvestmentResponse(CamelModel):
    id: UUID
    user_id: UUID
    name: str
    type: str
    average_price: Decimal
    quantity: Decimal
    current_value: Decimal
    profitability: Decimal
    profitability_percentage: Decimal
    created_at: datetime
    updated_at: datetime
    movements: Optional[List[InvestmentMovementResponse]] = None
