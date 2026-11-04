import logging

from fastapi import FastAPI, APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import inspect, text

from app.core.config import settings
from app.core.rate_limit import limiter
from app.database.connection import engine, Base, get_db
from app.services.branding import get_branding
from app.api import (
    auth, accounts, cards, categories, transactions,
    budgets, goals, investments, reports, custom_icons, portal
)

logger = logging.getLogger(__name__)

# Create database tables automatically if they don't exist
Base.metadata.create_all(bind=engine)

from app.database.shared_icons_migration import migrate_shared_icons

migrate_shared_icons(engine)

# Ad-hoc column migration: Base.metadata.create_all only creates missing
# TABLES, it never alters existing ones — so any column added to a model
# after its table already exists in a running database needs to be listed
# here too, or that database breaks with "no such column" the moment the ORM
# touches it. This is a stopgap for local/dev SQLite databases; a real schema
# change should get an Alembic migration (see backend/alembic.ini) generated
# and applied by the team instead of growing this list forever.
_NEW_COLUMNS = [
    ("transactions", "effective", "BOOLEAN NOT NULL DEFAULT 1"),
    ("transactions", "effective_date", "DATE"),
    ("transactions", "due_date", "DATE"),
    ("transactions", "recurrence_group_id", "CHAR(32)"),
    ("transactions", "recurrence_index", "INTEGER"),
    ("credit_cards", "color", "VARCHAR(7)"),
    ("credit_cards", "initial_invoice", "NUMERIC(15,2)"),
    ("credit_cards", "account_id", "CHAR(32)"),
    ("credit_cards", "is_main", "BOOLEAN NOT NULL DEFAULT 0"),
    ("credit_cards", "dynamic_closing", "BOOLEAN NOT NULL DEFAULT 0"),
    ("credit_cards", "due_business_days", "BOOLEAN NOT NULL DEFAULT 0"),
    ("accounts", "custom_icon_url", "TEXT"),
    ("credit_cards", "custom_icon_url", "TEXT"),
    ("categories", "display_order", "INTEGER NOT NULL DEFAULT 0"),
    ("users", "avatar_url", "TEXT"),
    ("budgets", "name", "VARCHAR(100)"),
    ("budgets", "color", "VARCHAR(7)"),
    ("budgets", "icon", "VARCHAR(40)"),
    ("budgets", "settings", "JSON NOT NULL DEFAULT '{}'"),
    ("budgets", "display_order", "INTEGER NOT NULL DEFAULT 0"),
]

inspector = inspect(engine)
existing_columns_by_table = {
    table: {column["name"] for column in inspector.get_columns(table)}
    for table in {table for table, _, _ in _NEW_COLUMNS}
}
with engine.connect() as conn:
    for table, column, ddl_type in _NEW_COLUMNS:
        if column in existing_columns_by_table[table]:
            continue
        try:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
            conn.commit()
        except Exception:
            logger.warning(f"Falha ao adicionar coluna {table}.{column}", exc_info=True)

# Seed default dev user felipe@test.com — apenas em ambiente de desenvolvimento
# local (ENV=development, o default quando a variável não está definida).
# Nunca deve rodar em staging/produção: defina ENV=production no ambiente real.
if settings.ENV == "development":
    from sqlalchemy.exc import IntegrityError
    from app.database.connection import SessionLocal
    from app.repositories.base import user_repo
    from app.core.security import hash_password, generate_totp_secret

    db = SessionLocal()
    try:
        if not user_repo.exists_by_email(db, "felipe@test.com"):
            mfa_secret = generate_totp_secret()
            user_data = {
                "full_name": "Felipe Padrão",
                "email": "felipe@test.com",
                "password_hash": hash_password("123456"),
                "mfa_enabled": False,
                "mfa_secret": mfa_secret
            }
            try:
                user = user_repo.create(db, obj_in=user_data)
            except IntegrityError:
                # Outro worker já criou o usuário entre a checagem e o insert.
                db.rollback()
                user = None

            if user is not None:
                # Seed default categories and subcategories for new user
                from app.database.seeding import seed_user_categories
                seed_user_categories(db, user.id)
    finally:
        db.close()



app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend migrated from Spring Boot to Python FastAPI",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS middleware configuration — origens vêm de ALLOWED_ORIGINS (ver
# app/core/config.py); defina essa variável em produção para restringir ao(s)
# domínio(s) real(is) do frontend em vez do "*" padrão de desenvolvimento.
allowed_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Main router for /api/v1 prefix
api_router = APIRouter(prefix=settings.API_V1_STR)

api_router.include_router(auth.router)
api_router.include_router(accounts.router)
api_router.include_router(cards.router)
api_router.include_router(categories.router)
api_router.include_router(transactions.router)
api_router.include_router(budgets.router)
api_router.include_router(goals.router)
api_router.include_router(investments.router)
api_router.include_router(reports.router)
api_router.include_router(custom_icons.router)
api_router.include_router(portal.router)

app.include_router(api_router)

@app.get("/")
def read_root(db: Session = Depends(get_db)):
    return {"message": f"{get_branding(db).name} API is running smoothly!"}
