from decimal import Decimal, ROUND_HALF_UP
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.database.connection import get_db
from app.api.deps import get_current_user
from app.models.models import User, Investment, InvestmentMovement
from app.schemas.investment import (
    InvestmentRequest, InvestmentResponse, 
    InvestmentMovementRequest, InvestmentMovementResponse
)
from app.repositories.base import investment_repo, movement_repo
from app.services.audit import AuditLogService

router = APIRouter(prefix="/investments", tags=["investments"])

def to_investment_response(inv: Investment, movements: List[InvestmentMovement] = None) -> InvestmentResponse:
    qty = inv.quantity or Decimal("0.000000")
    avg_price = inv.average_price or Decimal("0.0000")
    curr_val = inv.current_value or Decimal("0.00")

    total_cost = qty * avg_price
    profitability = curr_val - total_cost
    profitability_percentage = Decimal("0.00")
    
    if total_cost > 0:
        profitability_percentage = (profitability / total_cost) * Decimal("100")

    movement_resps = []
    if movements:
        for m in movements:
            movement_resps.append(
                InvestmentMovementResponse(
                    id=m.id,
                    investment_id=m.investment_id,
                    type=m.type,
                    quantity=m.quantity,
                    price=m.price,
                    date=m.date,
                    created_at=m.created_at
                )
            )

    return InvestmentResponse(
        id=inv.id,
        user_id=inv.user_id,
        name=inv.name,
        type=inv.type,
        average_price=avg_price,
        quantity=qty,
        current_value=curr_val,
        profitability=profitability.quantize(Decimal("0.01")),
        profitability_percentage=profitability_percentage.quantize(Decimal("0.01")),
        created_at=inv.created_at,
        updated_at=inv.updated_at,
        movements=movement_resps if movements else []
    )

@router.post("", response_model=InvestmentResponse)
def create_investment(
    request: InvestmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    initial_current_value = request.current_value or Decimal("0.00")
    
    obj_in = {
        "user_id": current_user.id,
        "name": request.name,
        "type": request.type.upper(),
        "average_price": Decimal("0.0000"),
        "quantity": Decimal("0.000000"),
        "current_value": initial_current_value
    }
    
    investment = investment_repo.create(db, obj_in=obj_in)
    response = to_investment_response(investment, [])
    AuditLogService.log_event(current_user.id, "CREATE", "INVESTMENT", investment.id, None, response)
    return response

@router.get("", response_model=List[InvestmentResponse])
def list_investments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    investments = investment_repo.find_by_user_id(db, current_user.id)
    responses = []
    for inv in investments:
        movements = movement_repo.find_by_investment_id(db, inv.id)
        responses.append(to_investment_response(inv, movements))
    return responses

@router.get("/{id}", response_model=InvestmentResponse)
def get_investment(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    investment = investment_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not investment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investimento não encontrado"
        )
    movements = movement_repo.find_by_investment_id(db, id)
    return to_investment_response(investment, movements)

@router.put("/{id}/current-value", response_model=InvestmentResponse)
def update_current_value(
    id: UUID,
    current_value: Decimal = Query(..., alias="currentValue"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    investment = investment_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not investment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investimento não encontrado"
        )
        
    if current_value < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O valor atual não pode ser negativo"
        )
        
    movements = movement_repo.find_by_investment_id(db, id)
    before = to_investment_response(investment, movements)
    
    obj_in = {"current_value": current_value}
    updated_investment = investment_repo.update(db, db_obj=investment, obj_in=obj_in)
    
    after = to_investment_response(updated_investment, movements)
    AuditLogService.log_event(current_user.id, "UPDATE", "INVESTMENT", updated_investment.id, before, after)
    return after

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investment(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    investment = investment_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not investment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investimento não encontrado"
        )
    movements = movement_repo.find_by_investment_id(db, id)
    before = to_investment_response(investment, movements)
    
    investment_repo.remove(db, id=id)
    AuditLogService.log_event(current_user.id, "DELETE", "INVESTMENT", id, before, None)

@router.post("/{id}/movements", response_model=InvestmentMovementResponse)
def add_movement(
    id: UUID,
    request: InvestmentMovementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    investment = investment_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not investment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investimento não encontrado"
        )
        
    qty = request.quantity
    price = request.price
    m_type = request.type.upper()
    
    if qty <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A quantidade deve ser maior que zero"
        )
    if price <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O preço deve ser maior que zero"
        )
    if m_type not in ["BUY", "SELL", "DIVIDEND"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de movimentação inválido. Deve ser BUY, SELL ou DIVIDEND"
        )
        
    old_qty = investment.quantity or Decimal("0.000000")
    old_avg_price = investment.average_price or Decimal("0.0000")
    old_current_value = investment.current_value or Decimal("0.00")
    
    if m_type == "BUY":
        new_qty = old_qty + qty
        total_old_cost = old_qty * old_avg_price
        new_cost = qty * price
        total_cost = total_old_cost + new_cost
        new_avg_price = (total_cost / new_qty).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        
        investment.quantity = new_qty
        investment.average_price = new_avg_price
        investment.current_value = old_current_value + new_cost
    elif m_type == "SELL":
        if qty > old_qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quantidade insuficiente para venda. Quantidade disponível: {old_qty}"
            )
        new_qty = old_qty - qty
        investment.quantity = new_qty
        
        if new_qty == 0:
            investment.average_price = Decimal("0.0000")
            investment.current_value = Decimal("0.00")
        else:
            new_current_value = (old_current_value * new_qty / old_qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            investment.current_value = new_current_value
            
    db.add(investment)
    
    movement_obj = InvestmentMovement(
        investment_id=id,
        type=m_type,
        quantity=qty,
        price=price,
        date=request.date
    )
    db.add(movement_obj)
    db.commit()
    db.refresh(movement_obj)
    
    response = InvestmentMovementResponse(
        id=movement_obj.id,
        investment_id=movement_obj.investment_id,
        type=movement_obj.type,
        quantity=movement_obj.quantity,
        price=movement_obj.price,
        date=movement_obj.date,
        created_at=movement_obj.created_at
    )
    
    AuditLogService.log_event(current_user.id, "CREATE", "INVESTMENT_MOVEMENT", movement_obj.id, None, response)
    return response
