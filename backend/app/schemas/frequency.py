from pydantic import BaseModel


class VerbFrequencyOut(BaseModel):
    verb_id: int
    corpus: str
    freq: int
    ipm: float
    variant_of: int | None = None

    model_config = {"from_attributes": True}


class LexemeFrequencyOut(BaseModel):
    lexeme_id: int
    corpus: str
    freq: int
    ipm: float

    model_config = {"from_attributes": True}
