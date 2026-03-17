from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Entry(Base):
    __tablename__ = "entries"

    id = Column(Integer, primary_key=True)
    pos = Column(String, nullable=False)          # 'noun', 'adjective', 'adverb'
    lemma = Column(String, nullable=False)
    accented = Column(String, nullable=False, unique=True)
    gender = Column(String, nullable=True)        # 'm'/'f'/'n' — for nouns
    number_type = Column(String, nullable=True)   # 'sg'/'pl'/'both' — for nouns

    forms = relationship("EntryForm", cascade="all, delete-orphan")
    lexeme = relationship("Lexeme", back_populates="entry", uselist=False)

    __table_args__ = (
        CheckConstraint("pos IN ('noun', 'adjective', 'adverb')", name="ck_entries_pos"),
        CheckConstraint("gender IN ('m', 'f', 'n') OR gender IS NULL", name="ck_entries_gender"),
        CheckConstraint(
            "number_type IN ('sg', 'pl', 'both') OR number_type IS NULL",
            name="ck_entries_number_type",
        ),
    )


class EntryForm(Base):
    __tablename__ = "entry_forms"

    id = Column(Integer, primary_key=True)
    entry_id = Column(Integer, ForeignKey("entries.id", ondelete="CASCADE"), nullable=False)
    tags = Column(String, nullable=False)   # e.g. "nom,sg" or "nom,sg,m" or "comparative"
    form = Column(String, nullable=False)   # comma-separated alternatives
