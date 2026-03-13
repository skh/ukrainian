from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.aspect_pair import AspectPairRead


class LexemeRead(BaseModel):
    id: int
    pos: str
    form: str
    pair_id: Optional[int] = None
    pair: Optional[AspectPairRead] = None

    model_config = ConfigDict(from_attributes=True)


class LexemeCreate(BaseModel):
    form: str
    pos: Literal["noun", "adjective", "adverb"]


class LexemeUpdate(BaseModel):
    form: Optional[str] = None
    pos: Optional[Literal["noun", "adjective", "adverb"]] = None


class WordFamilyRead(BaseModel):
    id: int
    members: list[LexemeRead]

    model_config = ConfigDict(from_attributes=True)
