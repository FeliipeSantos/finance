from pydantic import BaseModel, ConfigDict, PlainSerializer
from pydantic.alias_generators import to_camel
from decimal import Decimal as PyDecimal
from typing import Annotated

Decimal = Annotated[PyDecimal, PlainSerializer(lambda x: float(x), return_type=float)]

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

