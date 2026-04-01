from sqlalchemy import CheckConstraint, Column, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)


class PairTag(Base):
    __tablename__ = "pair_tags"

    pair_id = Column(Integer, ForeignKey("aspect_pairs.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class Verb(Base):
    __tablename__ = "verbs"

    id = Column(Integer, primary_key=True)
    infinitive = Column(String, nullable=False)
    accented = Column(String, nullable=False, unique=True)
    aspect = Column(String, nullable=False)

    forms = relationship("LexemeForm", foreign_keys="[LexemeForm.verb_id]", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("aspect IN ('ipf', 'pf')", name="ck_verbs_aspect"),
    )


class AspectPair(Base):
    __tablename__ = "aspect_pairs"

    id = Column(Integer, primary_key=True)
    ipf_verb_id = Column(Integer, ForeignKey("verbs.id"), nullable=True)
    pf_verb_id = Column(Integer, ForeignKey("verbs.id"), nullable=True)

    ipf_verb = relationship("Verb", foreign_keys=[ipf_verb_id])
    pf_verb = relationship("Verb", foreign_keys=[pf_verb_id])
    lexeme = relationship("Lexeme", back_populates="pair", uselist=False)

    @property
    def lexeme_id(self):
        return self.lexeme.id if self.lexeme else None

    __table_args__ = (
        UniqueConstraint("ipf_verb_id", "pf_verb_id", name="uq_aspect_pairs"),
        CheckConstraint("ipf_verb_id IS NOT NULL OR pf_verb_id IS NOT NULL", name="ck_aspect_pairs_not_both_null"),
    )


class VerbFrequency(Base):
    __tablename__ = "verb_frequencies"

    id = Column(Integer, primary_key=True)
    verb_id = Column(Integer, ForeignKey("verbs.id", ondelete="CASCADE"), nullable=False)
    corpus = Column(String, nullable=False)
    ipm = Column(Float, nullable=False)
    fetched_at = Column(DateTime, nullable=False)

    __table_args__ = (
        UniqueConstraint("verb_id", "corpus", name="uq_verb_frequencies"),
    )


class Derivation(Base):
    __tablename__ = "derivations"

    id = Column(Integer, primary_key=True)
    source_verb_id = Column(Integer, ForeignKey("verbs.id"), nullable=False)
    derived_verb_id = Column(Integer, ForeignKey("verbs.id"), nullable=False)

    type = Column(String, nullable=True)
    value = Column(String, nullable=True)

    source_verb = relationship("Verb", foreign_keys=[source_verb_id])
    derived_verb = relationship("Verb", foreign_keys=[derived_verb_id])

    __table_args__ = (
        UniqueConstraint("source_verb_id", "derived_verb_id", name="uq_derivations"),
        CheckConstraint(
            "type IS NULL OR type IN ('prefix', 'suffix', 'stem_change', 'stress_change', 'reflexive')",
            name="ck_derivations_type",
        ),
    )


