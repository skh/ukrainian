from pydantic import BaseModel, ConfigDict


class LexemeTranslationRead(BaseModel):
    id: int
    lexeme_id: int
    lang: str
    text: str

    model_config = ConfigDict(from_attributes=True)


# Keep as alias for any remaining references
PairTranslationRead = LexemeTranslationRead


class TranslationWrite(BaseModel):
    lang: str
    text: str


class TranslationUpdate(BaseModel):
    text: str
