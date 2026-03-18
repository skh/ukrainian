from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True)
    lang = Column(String, nullable=False)   # 'uk', 'en', 'de', …
    text = Column(String, nullable=False)
    notes = Column(String, nullable=True)

    translations = relationship("ChunkTranslation", cascade="all, delete-orphan")
    links = relationship("ChunkLink", cascade="all, delete-orphan")


class ChunkTranslation(Base):
    __tablename__ = "chunk_translations"

    id = Column(Integer, primary_key=True)
    chunk_id = Column(Integer, ForeignKey("chunks.id", ondelete="CASCADE"), nullable=False)
    lang = Column(String, nullable=False)
    text = Column(String, nullable=False)


class ChunkLink(Base):
    __tablename__ = "chunk_links"

    id = Column(Integer, primary_key=True)
    chunk_id = Column(Integer, ForeignKey("chunks.id", ondelete="CASCADE"), nullable=False)
    # nullable so links survive lexeme deletion (orphaned link is harmless)
    lexeme_id = Column(Integer, ForeignKey("lexemes.id", ondelete="SET NULL"), nullable=True)

    lexeme = relationship("Lexeme")
