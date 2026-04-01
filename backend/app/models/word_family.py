from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.database import Base


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
