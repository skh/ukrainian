from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.entry import LexemeRead


class WFLexemeCreate(BaseModel):
    """Schema for creating a new lexeme directly within a word family."""
    accented: str
    pos: Literal["noun", "adjective", "adverb", "conjunction", "numeral", "preposition", "pronoun"]


class WFLexemeUpdate(BaseModel):
    accented: Optional[str] = None
    lemma: Optional[str] = None
    pos: Optional[Literal["noun", "adjective", "adverb", "conjunction", "numeral", "preposition", "pronoun"]] = None


class WordFamilyRead(BaseModel):
    id: int
    members: list[LexemeRead]

    model_config = ConfigDict(from_attributes=True)


# Keep old names as aliases
LexemeCreate = WFLexemeCreate
LexemeUpdate = WFLexemeUpdate
