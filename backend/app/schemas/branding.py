from pydantic import Field, field_validator

from app.schemas.base import CamelModel
from app.schemas.custom_icon import SharedIconRequest


class BrandingSettings(CamelModel):
    name: str = Field(default="Finance", max_length=80)
    icon_data: str | None = Field(default=None, max_length=350_000)
    favicon_data: str | None = Field(default=None, max_length=350_000)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value):
        return value.strip() or "Finance"

    @field_validator("icon_data", "favicon_data")
    @classmethod
    def validate_image(cls, value):
        if not value:
            return None
        return SharedIconRequest(image_data=value).image_data
