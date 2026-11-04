from typing import TypeVar, Generic, Type, List, Optional
from uuid import UUID
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.database.connection import Base
from app.models.models import (
    User, Account, Category, CreditCard, Transaction,
    TransactionInstallment, Budget, Goal, Investment,
    InvestmentMovement, Notification, AuditLog, Settings, CustomIcon, SharedIcon
)

ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get(self, db: Session, id: UUID) -> Optional[ModelType]:
        return db.query(self.model).filter(self.model.id == id).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100) -> List[ModelType]:
        return db.query(self.model).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: dict) -> ModelType:
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: ModelType, obj_in: dict) -> ModelType:
        for field in obj_in:
            if hasattr(db_obj, field):
                setattr(db_obj, field, obj_in[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: UUID) -> Optional[ModelType]:
        obj = db.query(self.model).filter(self.model.id == id).first()
        if obj:
            db.delete(obj)
            db.commit()
        return obj


class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)

    def find_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def exists_by_email(self, db: Session, email: str) -> bool:
        return db.query(User).filter(User.email == email).first() is not None


class AccountRepository(BaseRepository[Account]):
    def __init__(self):
        super().__init__(Account)

    def find_by_user_id(self, db: Session, user_id: UUID) -> List[Account]:
        return db.query(Account).filter(Account.user_id == user_id).order_by(Account.name).all()

    def find_by_id_and_user_id(self, db: Session, id: UUID, user_id: UUID) -> Optional[Account]:
        return db.query(Account).filter(Account.id == id, Account.user_id == user_id).first()


class CategoryRepository(BaseRepository[Category]):
    def __init__(self):
        super().__init__(Category)

    def find_by_user_id_or_system(self, db: Session, user_id: UUID) -> List[Category]:
        return db.query(Category).filter(
            or_(Category.user_id == user_id, Category.user_id == None)
        ).order_by(Category.type, Category.parent_category_id, Category.display_order).all()

    def find_by_user_id(self, db: Session, user_id: UUID) -> List[Category]:
        return db.query(Category).filter(Category.user_id == user_id).all()

    def find_by_id_and_user_id_or_system(self, db: Session, id: UUID, user_id: UUID) -> Optional[Category]:
        return db.query(Category).filter(
            Category.id == id,
            or_(Category.user_id == user_id, Category.user_id == None)
        ).first()

    def reorder(self, db: Session, user_id: UUID, category_ids: List[UUID]) -> List[Category]:
        categories = db.query(Category).filter(
            Category.id.in_(category_ids),
            Category.user_id == user_id
        ).all()
        by_id = {c.id: c for c in categories}
        for index, cat_id in enumerate(category_ids):
            if cat_id in by_id:
                by_id[cat_id].display_order = index
        db.commit()
        return categories


class CreditCardRepository(BaseRepository[CreditCard]):
    def __init__(self):
        super().__init__(CreditCard)

    def find_by_user_id(self, db: Session, user_id: UUID) -> List[CreditCard]:
        return db.query(CreditCard).filter(CreditCard.user_id == user_id).all()

    def find_by_id_and_user_id(self, db: Session, id: UUID, user_id: UUID) -> Optional[CreditCard]:
        return db.query(CreditCard).filter(CreditCard.id == id, CreditCard.user_id == user_id).first()


class CustomIconRepository(BaseRepository[CustomIcon]):
    """Ícones privados do usuário e biblioteca global administrada pelo Portal."""
    def __init__(self):
        super().__init__(CustomIcon)

    def find_visible_to_user(self, db: Session, user_id: UUID) -> List[CustomIcon | SharedIcon]:
        shared = db.query(SharedIcon).order_by(SharedIcon.created_at).all()
        private = db.query(CustomIcon).filter(CustomIcon.user_id == user_id).order_by(CustomIcon.created_at).all()
        return shared + private

    def find_by_image_data_visible_to_user(self, db: Session, image_data: str, user_id: UUID) -> Optional[CustomIcon | SharedIcon]:
        shared = db.query(SharedIcon).filter(SharedIcon.image_data == image_data).first()
        if shared:
            return shared
        return db.query(CustomIcon).filter(
            CustomIcon.image_data == image_data, CustomIcon.user_id == user_id
        ).first()

    def find_by_id_and_user_id(self, db: Session, id: UUID, user_id: UUID) -> Optional[CustomIcon]:
        return db.query(CustomIcon).filter(CustomIcon.id == id, CustomIcon.user_id == user_id).first()


class TransactionRepository(BaseRepository[Transaction]):
    def __init__(self):
        super().__init__(Transaction)

    def find_by_user_id(self, db: Session, user_id: UUID) -> List[Transaction]:
        return db.query(Transaction).filter(Transaction.user_id == user_id).all()

    def find_by_id_and_user_id(self, db: Session, id: UUID, user_id: UUID) -> Optional[Transaction]:
        return db.query(Transaction).filter(Transaction.id == id, Transaction.user_id == user_id).first()


class TransactionInstallmentRepository(BaseRepository[TransactionInstallment]):
    def __init__(self):
        super().__init__(TransactionInstallment)

    def find_by_transaction_id(self, db: Session, transaction_id: UUID) -> List[TransactionInstallment]:
        return db.query(TransactionInstallment).filter(
            TransactionInstallment.transaction_id == transaction_id
        ).order_by(TransactionInstallment.installment_number).all()


class BudgetRepository(BaseRepository[Budget]):
    def __init__(self):
        super().__init__(Budget)

    def find_by_user_id(self, db: Session, user_id: UUID) -> List[Budget]:
        return db.query(Budget).filter(Budget.user_id == user_id).all()

    def find_by_id_and_user_id(self, db: Session, id: UUID, user_id: UUID) -> Optional[Budget]:
        return db.query(Budget).filter(Budget.id == id, Budget.user_id == user_id).first()

    def find_by_user_and_category_and_date(
        self, db: Session, user_id: UUID, category_id: UUID, month: int, year: int
    ) -> Optional[Budget]:
        return db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.category_id == category_id,
            Budget.month == month,
            Budget.year == year
        ).first()


class GoalRepository(BaseRepository[Goal]):
    def __init__(self):
        super().__init__(Goal)

    def find_by_user_id(self, db: Session, user_id: UUID) -> List[Goal]:
        return db.query(Goal).filter(Goal.user_id == user_id).all()

    def find_by_id_and_user_id(self, db: Session, id: UUID, user_id: UUID) -> Optional[Goal]:
        return db.query(Goal).filter(Goal.id == id, Goal.user_id == user_id).first()


class InvestmentRepository(BaseRepository[Investment]):
    def __init__(self):
        super().__init__(Investment)

    def find_by_user_id(self, db: Session, user_id: UUID) -> List[Investment]:
        return db.query(Investment).filter(Investment.user_id == user_id).all()

    def find_by_id_and_user_id(self, db: Session, id: UUID, user_id: UUID) -> Optional[Investment]:
        return db.query(Investment).filter(Investment.id == id, Investment.user_id == user_id).first()


class InvestmentMovementRepository(BaseRepository[InvestmentMovement]):
    def __init__(self):
        super().__init__(InvestmentMovement)

    def find_by_investment_id(self, db: Session, investment_id: UUID) -> List[InvestmentMovement]:
        return db.query(InvestmentMovement).filter(
            InvestmentMovement.investment_id == investment_id
        ).order_by(InvestmentMovement.date.desc()).all()


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self):
        super().__init__(Notification)

    def find_by_user_id(self, db: Session, user_id: UUID) -> List[Notification]:
        return db.query(Notification).filter(Notification.user_id == user_id).all()


class AuditLogRepository(BaseRepository[AuditLog]):
    def __init__(self):
        super().__init__(AuditLog)


class SettingsRepository(BaseRepository[Settings]):
    def __init__(self):
        super().__init__(Settings)

    def find_by_user_id(self, db: Session, user_id: UUID) -> Optional[Settings]:
        return db.query(Settings).filter(Settings.user_id == user_id).first()


# Instantiate singleton repositories for easy import
user_repo = UserRepository()
account_repo = AccountRepository()
category_repo = CategoryRepository()
card_repo = CreditCardRepository()
custom_icon_repo = CustomIconRepository()
transaction_repo = TransactionRepository()
installment_repo = TransactionInstallmentRepository()
budget_repo = BudgetRepository()
goal_repo = GoalRepository()
investment_repo = InvestmentRepository()
movement_repo = InvestmentMovementRepository()
notification_repo = NotificationRepository()
audit_repo = AuditLogRepository()
settings_repo = SettingsRepository()
