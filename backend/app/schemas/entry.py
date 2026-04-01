from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.aspect_pair import AspectPairRead


class LexemeFormCreate(BaseModel):
    tags: str   # e.g. "nom,sg" or "nom,sg,m"
    form: str


class LexemeFormRead(BaseModel):
    id: int
    lexeme_id: int
    tags: str
    form: str

    model_config = ConfigDict(from_attributes=True)


class LexemeCreate(BaseModel):
    lemma: str
    accented: str
    gender: Optional[Literal['m', 'f', 'n']] = None
    number_type: Optional[Literal['sg', 'pl', 'both']] = None


class WordCreate(BaseModel):
    pos: Literal['conjunction', 'preposition', 'adverb']
    accented: str


class LexemeUpdate(BaseModel):
    lemma: Optional[str] = None
    accented: Optional[str] = None
    gender: Optional[Literal['m', 'f', 'n']] = None
    number_type: Optional[Literal['sg', 'pl', 'both']] = None


class LexemeRead(BaseModel):
    id: int
    pos: str
    lemma: str
    accented: str
    gender: Optional[str] = None
    number_type: Optional[str] = None
    pair_id: Optional[int] = None
    pair: Optional[AspectPairRead] = None
    forms: list[LexemeFormRead] = []

    model_config = ConfigDict(from_attributes=True)


# Keep old names as aliases for code that hasn't been updated yet
EntryFormCreate = LexemeFormCreate
EntryFormRead = LexemeFormRead
EntryCreate = LexemeCreate
EntryUpdate = LexemeUpdate
EntryRead = LexemeRead
