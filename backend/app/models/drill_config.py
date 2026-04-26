from sqlalchemy import Column, Integer, String, Text

from app.database import Base


class DrillConfig(Base):
    __tablename__ = "drill_configs"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    config = Column(Text, nullable=False)  # JSON blob
