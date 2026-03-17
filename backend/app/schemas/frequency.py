from datetime import datetime

from pydantic import BaseModel


class FrequencyRead(BaseModel):
    id: int
    verb_id: int
    corpus: str
    ipm: float
    fetched_at: datetime

    model_config = {"from_attributes": True}
