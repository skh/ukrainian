from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.schemas.verb import VerbRead

DerivationType = Literal["prefix", "suffix", "stem_change", "stress_change", "reflexive"]


class DerivationCreate(BaseModel):
    source_verb_id: int
    derived_verb_id: int
    type: DerivationType | None = None
    value: str | None = None


class DerivationUpdate(BaseModel):
    type: DerivationType | None = None
    value: str | None = None


class DerivationRead(BaseModel):
    id: int
    source_verb_id: int
    derived_verb_id: int
    type: DerivationType | None
    value: str | None
    source_verb: VerbRead
    derived_verb: VerbRead

    model_config = ConfigDict(from_attributes=True)
