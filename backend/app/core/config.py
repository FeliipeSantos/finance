import logging
import os
import secrets

logger = logging.getLogger(__name__)


def _resolve_jwt_secret(env: str) -> str:
    jwt_secret = os.getenv("JWT_SECRET")
    if jwt_secret:
        return jwt_secret
    if env != "development":
        raise RuntimeError("JWT_SECRET precisa ser definido via variável de ambiente fora de development")
    # Gerado uma vez por processo: evita reutilizar o segredo fixo que estava
    # hardcoded no código-fonte (visível a qualquer um com acesso ao repo).
    # Tokens emitidos não sobrevivem a um restart do processo — aceitável em
    # dev local, defina JWT_SECRET explicitamente para qualquer ambiente real.
    logger.warning("JWT_SECRET não definido — usando um segredo aleatório gerado só para esta execução (dev only)")
    return secrets.token_hex(32)


class Settings:
    PROJECT_NAME: str = "Finance Backend"
    API_V1_STR: str = "/api/v1"
    PORTAL_ADMIN_PASSWORD: str = os.getenv("PORTAL_ADMIN_PASSWORD", "admin")
    ENV: str = os.getenv("ENV", "development")

    JWT_SECRET: str = _resolve_jwt_secret(ENV)
    JWT_EXPIRATION: int = int(os.getenv("JWT_EXPIRATION", 86400))  # 24 hours in seconds
    JWT_REFRESH_EXPIRATION: int = int(os.getenv("JWT_REFRESH_EXPIRATION", 604800))  # 7 days in seconds

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./finance.db"
    )
    
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", 6379))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")

    # Lista separada por vírgula, ex.: "https://app.fincontrol.com,https://staging.fincontrol.com"
    # Default "*" mantém o comportamento atual para rodar localmente sem configurar nada.
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")

settings = Settings()
