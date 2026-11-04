import json
from uuid import UUID
from typing import Any, Optional
from app.models.models import AuditLog
from app.database.connection import SessionLocal

class AuditLogService:
    @staticmethod
    def log_event(
        user_id: Optional[UUID],
        action: str,
        entity_name: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        payload_before: Any = None,
        payload_after: Any = None,
        ip_address: str = "UNKNOWN",
        user_agent: str = "UNKNOWN"
    ) -> None:
        try:
            before_json = None
            if payload_before is not None:
                if hasattr(payload_before, "model_dump"):
                    before_json = json.dumps(payload_before.model_dump(mode="json"))
                elif hasattr(payload_before, "__dict__"):
                    before_json = json.dumps(payload_before.__dict__)
                else:
                    before_json = json.dumps(payload_before)

            after_json = None
            if payload_after is not None:
                if hasattr(payload_after, "model_dump"):
                    after_json = json.dumps(payload_after.model_dump(mode="json"))
                elif hasattr(payload_after, "__dict__"):
                    after_json = json.dumps(payload_after.__dict__)
                else:
                    after_json = json.dumps(payload_after)

            audit_log = AuditLog(
                user_id=user_id,
                action=action,
                entity_name=entity_name,
                entity_id=entity_id,
                payload_before=before_json,
                payload_after=after_json,
                ip_address=ip_address,
                user_agent=user_agent
            )

            # Emulates PROPAGATION_REQUIRES_NEW by opening a fresh, separate database session
            with SessionLocal() as audit_db:
                audit_db.add(audit_log)
                audit_db.commit()
        except Exception as e:
            # Soft failure to prevent audit issues from blocking business logic
            import logging
            logging.getLogger("uvicorn.error").error(f"Failed to persist Audit Log: {e}")
