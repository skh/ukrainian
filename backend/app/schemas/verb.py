from typing import Literal

from pydantic import BaseModel, ConfigDict


class VerbBase(BaseModel):
    infinitive: str
    accented: str
    aspect: Literal["ipf", "pf"]


class VerbCreate(VerbBase):
    pass


class VerbUpdate(BaseModel):
    infinitive: str | None = None
    accented: str | None = None
    aspect: Literal["ipf", "pf"] | None = None


class VerbRead(VerbBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
