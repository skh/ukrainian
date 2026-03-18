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
    # display info resolved from the lexeme
    lexeme_pos: Optional[str] = None
    lexeme_form: Optional[str] = None

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
