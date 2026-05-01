from pydantic import BaseModel
from pydantic import ConfigDict


class RefPairBase(BaseModel):
    ipf:    str | None = None
    pf:     str | None = None
    source: str | None = None
    notes:  str | None = None


class RefPairCreate(RefPairBase):
    pass


class RefPairRead(RefPairBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class RefPairUpdate(RefPairBase):
    pass
