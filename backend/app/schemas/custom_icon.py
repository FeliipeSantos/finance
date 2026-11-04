from uuid import UUID
from datetime import datetime
from app.schemas.base import CamelModel
from pydantic import Field, field_validator
import base64
import binascii

class CustomIconRequest(CamelModel):
    image_data: str


class SharedIconRequest(CamelModel):
    image_data: str = Field(min_length=1, max_length=350_000)

    @field_validator("image_data")
    @classmethod
    def validate_image(cls, value):
        header, separator, encoded = value.partition(",")
        allowed = {"data:image/png;base64", "data:image/jpeg;base64", "data:image/webp;base64"}
        if not separator or header not in allowed:
            raise ValueError("Envie uma imagem PNG, JPEG ou WebP.")
        try:
            raw = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error):
            raise ValueError("Imagem inválida.")
        valid = (
            (header == "data:image/png;base64" and raw.startswith(b"\x89PNG\r\n\x1a\n"))
            or (header == "data:image/jpeg;base64" and raw.startswith(b"\xff\xd8\xff"))
            or (header == "data:image/webp;base64" and raw.startswith(b"RIFF") and raw[8:12] == b"WEBP")
        )
        if not valid:
            raise ValueError("Imagem inválida.")
        return value

class CustomIconResponse(CamelModel):
    id: UUID
    image_data: str
    created_at: datetime
    # True apenas quando o usuário autenticado foi quem enviou esse ícone —
    # ícones globais só podem ser removidos pelas rotas administrativas.
    can_delete: bool = False
    is_shared: bool = False
