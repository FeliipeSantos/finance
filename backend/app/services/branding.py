from sqlalchemy.orm import Session

from app.models.models import PlatformBranding
from app.schemas.branding import BrandingSettings


def get_branding(db: Session) -> BrandingSettings:
    record = db.get(PlatformBranding, 1)
    if record is None:
        return BrandingSettings()
    return BrandingSettings(name=record.name, icon_data=record.icon_data, favicon_data=record.favicon_data)
