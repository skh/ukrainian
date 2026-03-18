from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class EntryFormCreate(BaseModel):
    tags: str   # e.g. "nom,sg" or "nom,sg,m"
    form: str


class EntryFormRead(BaseModel):
    id: int
    entry_id: int
    tags: str
    form: str

    model_config = ConfigDict(from_attributes=True)


class EntryCreate(BaseModel):
    lemma: str
    accented: str
    gender: Optional[Literal['m', 'f', 'n']] = None
    number_type: Optional[Literal['sg', 'pl', 'both']] = None


class EntryUpdate(BaseModel):
    lemma: Optional[str] = None
    accented: Optional[str] = None
    gender: Optional[Literal['m', 'f', 'n']] = None
    number_type: Optional[Literal['sg', 'pl', 'both']] = None


class EntryRead(BaseModel):
    id: int
    pos: str
    lemma: str
    accented: str
    gender: Optional[str] = None
    number_type: Optional[str] = None
    forms: list[EntryFormRead] = []

    model_config = ConfigDict(from_attributes=True)
