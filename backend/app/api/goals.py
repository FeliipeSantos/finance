from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.database.connection import get_db
from app.api.deps import get_current_user
from app.models.models import User, Goal
from app.schemas.goal import GoalRequest, GoalResponse
from app.repositories.base import goal_repo
from app.services.audit import AuditLogService

router = APIRouter(prefix="/goals", tags=["goals"])

@router.post("", response_model=GoalResponse)
def create_goal(
    request: GoalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    obj_in = {
        "user_id": current_user.id,
        "name": request.name,
        "description": request.description,
        "target_value": request.target_value,
        "current_value": request.current_value,
        "deadline": request.deadline,
        "status": request.status
    }
    goal = goal_repo.create(db, obj_in=obj_in)
    response = GoalResponse.model_validate(goal)
    AuditLogService.log_event(current_user.id, "CREATE", "GOAL", goal.id, None, response)
    return response

@router.get("", response_model=List[GoalResponse])
def list_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goals = goal_repo.find_by_user_id(db, current_user.id)
    return [GoalResponse.model_validate(g) for g in goals]

@router.get("/{id}", response_model=GoalResponse)
def get_goal(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = goal_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta financeira não encontrada"
        )
    return GoalResponse.model_validate(goal)

@router.put("/{id}", response_model=GoalResponse)
def update_goal(
    id: UUID,
    request: GoalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = goal_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta financeira não encontrada"
        )
        
    before = GoalResponse.model_validate(goal)
    
    obj_in = {
        "name": request.name,
        "description": request.description,
        "target_value": request.target_value,
        "current_value": request.current_value,
        "deadline": request.deadline,
        "status": request.status
    }
    
    updated_goal = goal_repo.update(db, db_obj=goal, obj_in=obj_in)
    after = GoalResponse.model_validate(updated_goal)
    AuditLogService.log_event(current_user.id, "UPDATE", "GOAL", updated_goal.id, before, after)
    return after

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = goal_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta financeira não encontrada"
        )
    before = GoalResponse.model_validate(goal)
    goal_repo.remove(db, id=id)
    AuditLogService.log_event(current_user.id, "DELETE", "GOAL", id, before, None)
