from sqlalchemy import Column, Integer, String, CheckConstraint
from app.database import Base


class RefPair(Base):
    __tablename__ = "ref_pairs"
    __table_args__ = (
        CheckConstraint("ipf IS NOT NULL OR pf IS NOT NULL", name="ck_ref_pairs_not_both_null"),
    )

    id     = Column(Integer, primary_key=True)
    ipf    = Column(String, nullable=True)
    pf     = Column(String, nullable=True)
    source = Column(String, nullable=True)
    notes  = Column(String, nullable=True)
