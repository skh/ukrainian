from pydantic import BaseModel


class PairTranslationRead(BaseModel):
    id: int
    pair_id: int
    lang: str
    text: str

    model_config = {"from_attributes": True}


class TranslationWrite(BaseModel):
    lang: str
    text: str


class TranslationUpdate(BaseModel):
    text: str
