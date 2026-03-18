from typing import Optional

from pydantic import BaseModel, ConfigDict


class ChunkTranslationRead(BaseModel):
    id: int
    chunk_id: int
    lang: str
    text: str

    model_config = ConfigDict(from_attributes=True)


class ChunkLinkRead(BaseModel):
    id: int
    chunk_id: int
    lexeme_id: Optional[int]
    lexeme_pos: Optional[str] = None
    lexeme_form: Optional[str] = None
    # for verbs: pair_id + label "ipf / pf"
    pair_id: Optional[int] = None
    pair_label: Optional[str] = None
    # for nouns/other entries: entry_id
    entry_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ChunkRead(BaseModel):
    id: int
    lang: str
    text: str
    notes: Optional[str]
    translations: list[ChunkTranslationRead] = []
    links: list[ChunkLinkRead] = []

    model_config = ConfigDict(from_attributes=True)


class ChunkCreate(BaseModel):
    lang: str
    text: str
    notes: Optional[str] = None


class ChunkUpdate(BaseModel):
    lang: Optional[str] = None
    text: Optional[str] = None
    notes: Optional[str] = None


class ChunkTranslationWrite(BaseModel):
    lang: str
    text: str


class ChunkTranslationUpdate(BaseModel):
    text: str


class ChunkLinkWrite(BaseModel):
    lexeme_id: int


class SuggestedLink(BaseModel):
    lexeme_id: int
    lexeme_pos: str
    lexeme_form: str
    matched_form: str   # the token in the text that matched
