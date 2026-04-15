from typing import Literal

from pydantic import BaseModel, ConfigDict


class VerbFormCreate(BaseModel):
    tense: Literal["present", "future", "past", "imperative"]
    person: Literal["1", "2", "3"] | None = None
    number: Literal["singular", "plural"] | None = None
    gender: Literal["masculine", "feminine", "neuter"] | None = None
    form: str  # comma-separated alternatives


class VerbFormRead(VerbFormCreate):
    id: int
    verb_id: int

    model_config = ConfigDict(from_attributes=True)


class VerbFormUpdate(BaseModel):
    form: str

