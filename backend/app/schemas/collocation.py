from pydantic import BaseModel


class CollocationRead(BaseModel):
    id: int
    pair_id: int
    text: str

    model_config = {"from_attributes": True}


class CollocationCreate(BaseModel):
    text: str
