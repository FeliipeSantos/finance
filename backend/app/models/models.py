import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Date, Numeric, Integer, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from app.database.connection import Base


class PlatformBranding(Base):
    __tablename__ = "platform_branding"

    id = Column(Integer, primary_key=True, default=1)
    name = Column(String(80), nullable=False, default="Finance")
    icon_data = Column(Text, nullable=True)
    favicon_data = Column(Text, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    mfa_secret = Column(String(64), nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    credit_cards = relationship("CreditCard", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan", foreign_keys="[Transaction.user_id]")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    investments = relationship("Investment", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("Settings", uselist=False, back_populates="user", cascade="all, delete-orphan")
    custom_icons = relationship("CustomIcon", back_populates="user", cascade="all, delete-orphan")


class Account(Base):
    __tablename__ = "accounts"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)
    institution = Column(String(50), nullable=True)
    balance_initial = Column(Numeric(15, 2), nullable=False, default=0.00)
    balance_current = Column(Numeric(15, 2), nullable=False, default=0.00)
    color = Column(String(7), nullable=False)
    type = Column(String(30), nullable=False)  # CHECKING, SAVINGS, etc.
    is_active = Column(Boolean, default=True)
    overdraft = Column(Numeric(15, 2), nullable=False, default=0.00)
    account_number = Column(String(50), nullable=True)
    additional_data = Column(Text, nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    show_in_resume = Column(Boolean, nullable=False, default=True)
    is_investment = Column(Boolean, nullable=False, default=False)
    ignore_in_totals = Column(Boolean, nullable=False, default=False)
    account_group = Column(String(50), nullable=True, default="Nenhum")
    icon = Column(String(30), nullable=True, default="bank")
    custom_icon_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", foreign_keys="[Transaction.account_id]")


class CreditCard(Base):
    __tablename__ = "credit_cards"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)
    bank = Column(String(50), nullable=True)
    brand = Column(String(30), nullable=False)
    limit_total = Column(Numeric(15, 2), nullable=False)
    closing_day = Column(Integer, nullable=False)
    due_day = Column(Integer, nullable=False)
    color = Column(String(7), nullable=True, default="#3B82F6")
    initial_invoice = Column(Numeric(15, 2), nullable=True, default=0.00)
    account_id = Column(PG_UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    is_main = Column(Boolean, nullable=False, default=False)
    dynamic_closing = Column(Boolean, nullable=False, default=False)
    due_business_days = Column(Boolean, nullable=False, default=False)
    custom_icon_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="credit_cards")
    transactions = relationship("Transaction", back_populates="credit_card")
    account = relationship("Account")


class CustomIcon(Base):
    """Imagem personalizada enviada pelo usuário (ex.: logo de banco não
    cadastrado) — fica disponível para reuso em qualquer conta ou cartão do
    mesmo usuário no seletor de ícones."""
    __tablename__ = "custom_icons"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    image_data = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", back_populates="custom_icons")


class SharedIcon(Base):
    """Biblioteca global administrada pelo Portal, independente de usuários."""
    __tablename__ = "shared_icons"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    image_data = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class DataMigration(Base):
    __tablename__ = "data_migrations"

    name = Column(String(100), primary_key=True)
    applied_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class Category(Base):
    __tablename__ = "categories"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)  # Nullable if system default
    name = Column(String(50), nullable=False)
    type = Column(String(15), nullable=False)  # REVENUE, EXPENSE, ACCOUNTS
    parent_category_id = Column(PG_UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    color = Column(String(7), nullable=True)
    icon = Column(String(30), nullable=True)
    display_order = Column(Integer, nullable=False, default=0, server_default="0")
    show_in_accounts_by_category = Column(Boolean, nullable=False, default=True)
    show_in_category_summary = Column(Boolean, nullable=False, default=True)
    show_in_category_balance = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="categories")
    parent_category = relationship("Category", remote_side=[id], backref="subcategories")
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(PG_UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    destination_account_id = Column(PG_UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    category_id = Column(PG_UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    credit_card_id = Column(PG_UUID(as_uuid=True), ForeignKey("credit_cards.id", ondelete="SET NULL"), nullable=True)
    value = Column(Numeric(15, 2), nullable=False)
    date = Column(Date, nullable=False)
    type = Column(String(15), nullable=False)  # REVENUE, EXPENSE, TRANSFER
    description = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    attachments_url = Column(Text, nullable=True)
    tags = Column(String(255), nullable=True)
    effective = Column(Boolean, nullable=False, default=True)
    effective_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    # Identifica a série de uma transação parcelada/fixa (mesmo valor para
    # todas as parcelas geradas numa mesma chamada) e a posição dela na série
    # (1-based) — usado por delete_recurrent_transaction para agir sobre a
    # série certa sem depender de casar texto da descrição. Nulo para
    # transações avulsas e para registros criados antes desta coluna existir.
    recurrence_group_id = Column(PG_UUID(as_uuid=True), nullable=True)
    recurrence_index = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="transactions", foreign_keys=[user_id])
    account = relationship("Account", back_populates="transactions", foreign_keys=[account_id])
    destination_account = relationship("Account", foreign_keys=[destination_account_id])
    category = relationship("Category", back_populates="transactions")
    credit_card = relationship("CreditCard", back_populates="transactions")
    installments = relationship("TransactionInstallment", back_populates="transaction", cascade="all, delete-orphan")


class TransactionInstallment(Base):
    __tablename__ = "transaction_installments"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(PG_UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    installment_number = Column(Integer, nullable=False)
    total_installments = Column(Integer, nullable=False)
    value = Column(Numeric(15, 2), nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String(15), nullable=False, default="PENDING")  # PENDING, PAID
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    transaction = relationship("Transaction", back_populates="installments")


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(PG_UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    limit_value = Column(Numeric(15, 2), nullable=False)
    current_value = Column(Numeric(15, 2), nullable=False, default=0.00)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    name = Column(String(100), nullable=True)
    color = Column(String(7), nullable=True)
    icon = Column(String(40), nullable=True)
    settings = Column(JSON, nullable=False, default=dict)
    display_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    target_value = Column(Numeric(15, 2), nullable=False)
    current_value = Column(Numeric(15, 2), nullable=False, default=0.00)
    deadline = Column(Date, nullable=True)
    status = Column(String(15), nullable=False, default="ACTIVE")  # ACTIVE, COMPLETED, ABANDONED
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="goals")


class Investment(Base):
    __tablename__ = "investments"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(String(30), nullable=False)
    average_price = Column(Numeric(15, 4), nullable=False, default=0.0000)
    quantity = Column(Numeric(15, 6), nullable=False, default=0.000000)
    current_value = Column(Numeric(15, 2), nullable=False, default=0.00)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="investments")
    movements = relationship("InvestmentMovement", back_populates="investment", cascade="all, delete-orphan")


class InvestmentMovement(Base):
    __tablename__ = "investment_movements"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investment_id = Column(PG_UUID(as_uuid=True), ForeignKey("investments.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(10), nullable=False)  # BUY, SELL, DIVIDEND
    quantity = Column(Numeric(15, 6), nullable=False)
    price = Column(Numeric(15, 4), nullable=False)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    investment = relationship("Investment", back_populates="movements")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    type = Column(String(30), default="INFO")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False)  # LOGIN, LOGOUT, CREATE, UPDATE, DELETE
    entity_name = Column(String(50), nullable=True)
    entity_id = Column(PG_UUID(as_uuid=True), nullable=True)
    payload_before = Column(Text, nullable=True)
    payload_after = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class Settings(Base):
    __tablename__ = "settings"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    theme = Column(String(15), default="dark")
    language = Column(String(5), default="pt-BR")
    notifications_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="settings")
