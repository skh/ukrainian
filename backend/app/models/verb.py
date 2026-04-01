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

    forms = relationship("VerbForm", back_populates="verb", cascade="all, delete-orphan")

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


class PairTranslation(Base):
    __tablename__ = "pair_translations"

    id = Column(Integer, primary_key=True)
    pair_id = Column(Integer, ForeignKey("aspect_pairs.id", ondelete="CASCADE"), nullable=False)
    lang = Column(String, nullable=False)
    text = Column(String, nullable=False)


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


class VerbForm(Base):
    __tablename__ = "verb_forms"

    id = Column(Integer, primary_key=True)
    verb_id = Column(Integer, ForeignKey("verbs.id"), nullable=False)
    tense = Column(String, nullable=False)
    person = Column(String, nullable=True)
    number = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    form = Column(String, nullable=False)

    verb = relationship("Verb", back_populates="forms")

    __table_args__ = (
        CheckConstraint(
            "tense IN ('present', 'future', 'past', 'imperative')",
            name="ck_verb_forms_tense",
        ),
        CheckConstraint("person IS NULL OR person IN ('1', '2', '3')", name="ck_verb_forms_person"),
        CheckConstraint("number IS NULL OR number IN ('singular', 'plural')", name="ck_verb_forms_number"),
        CheckConstraint("gender IS NULL OR gender IN ('masculine', 'feminine', 'neuter')", name="ck_verb_forms_gender"),
    )
