from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class Lexeme(Base):
    __tablename__ = "lexemes"

    id = Column(Integer, primary_key=True)
    pos = Column(String, nullable=False)
    form = Column(String, nullable=False)
    pair_id = Column(Integer, ForeignKey("aspect_pairs.id", ondelete="CASCADE"), nullable=True)

    pair = relationship("AspectPair", foreign_keys=[pair_id])

    __table_args__ = (
        UniqueConstraint("pair_id", name="uq_lexemes_pair_id"),
        CheckConstraint(
            "(pos = 'pair' AND pair_id IS NOT NULL) OR (pos != 'pair' AND pair_id IS NULL)",
            name="ck_lexemes_pair_id_consistent",
        ),
        CheckConstraint("pos IN ('pair', 'noun', 'adjective', 'adverb')", name="ck_lexemes_pos"),
    )


class WordFamily(Base):
    __tablename__ = "word_families"

    id = Column(Integer, primary_key=True)

    members = relationship("WordFamilyMember", back_populates="family", cascade="all, delete-orphan")


class WordFamilyMember(Base):
    __tablename__ = "word_family_members"

    family_id = Column(Integer, ForeignKey("word_families.id", ondelete="CASCADE"), primary_key=True)
    lexeme_id = Column(Integer, ForeignKey("lexemes.id", ondelete="CASCADE"), primary_key=True)

    family = relationship("WordFamily", back_populates="members")
    lexeme = relationship("Lexeme")
