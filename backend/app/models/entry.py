from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Lexeme(Base):
    __tablename__ = "lexemes"

    id = Column(Integer, primary_key=True)
    pos = Column(String, nullable=False)
    lemma = Column(String, nullable=False)
    accented = Column(String, nullable=False, unique=True)
    gender = Column(String, nullable=True)        # 'm'/'f'/'n' — for nouns
    number_type = Column(String, nullable=True)   # 'sg'/'pl'/'both' — for nouns
    pair_id = Column(Integer, ForeignKey("aspect_pairs.id", ondelete="CASCADE"), nullable=True, unique=True)

    forms = relationship("LexemeForm", foreign_keys="[LexemeForm.lexeme_id]", cascade="all, delete-orphan")
    pair = relationship("AspectPair", back_populates="lexeme")

    __table_args__ = (
        CheckConstraint("pos IN ('pair', 'noun', 'adjective', 'adverb', 'conjunction', 'numeral', 'preposition', 'pronoun')", name="ck_lexemes_pos"),
        CheckConstraint("gender IN ('m', 'f', 'n') OR gender IS NULL", name="ck_lexemes_gender"),
        CheckConstraint("number_type IN ('sg', 'pl', 'both') OR number_type IS NULL", name="ck_lexemes_number_type"),
    )


class LexemeForm(Base):
    __tablename__ = "lexeme_forms"

    id = Column(Integer, primary_key=True)
    lexeme_id = Column(Integer, ForeignKey("lexemes.id", ondelete="CASCADE"), nullable=True)
    verb_id = Column(Integer, ForeignKey("verbs.id", ondelete="CASCADE"), nullable=True)
    tags = Column(String, nullable=False)
    form = Column(String, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "(lexeme_id IS NOT NULL AND verb_id IS NULL) OR (lexeme_id IS NULL AND verb_id IS NOT NULL)",
            name="ck_lexeme_forms_one_parent",
        ),
    )


# Keep old names as aliases
Entry = Lexeme
EntryForm = LexemeForm
