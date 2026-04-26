from pydantic import BaseModel, ConfigDict


class DrillConfigBase(BaseModel):
    name: str
    config: str  # raw JSON string


class DrillConfigCreate(DrillConfigBase):
    pass


class DrillConfigRead(DrillConfigBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class DrillConfigUpdate(BaseModel):
    name: str | None = None
    config: str | None = None
