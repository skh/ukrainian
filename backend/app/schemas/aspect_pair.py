from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.verb import VerbRead


class AspectPairCreate(BaseModel):
    ipf_verb_id: int
    pf_verb_id: int


class SoloPairCreate(BaseModel):
    verb_id: int


class AspectPairAddPartner(BaseModel):
    verb_id: int


class AspectPairRead(BaseModel):
    id: int
    ipf_verb_id: Optional[int] = None
    pf_verb_id: Optional[int] = None
    ipf_verb: Optional[VerbRead] = None
    pf_verb: Optional[VerbRead] = None
    lexeme_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
