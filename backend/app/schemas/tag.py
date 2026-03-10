from pydantic import BaseModel, ConfigDict


class TagCreate(BaseModel):
    name: str


class TagRead(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class PairTagRead(BaseModel):
    pair_id: int
    tag_id: int

    model_config = ConfigDict(from_attributes=True)
