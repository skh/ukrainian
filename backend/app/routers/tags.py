from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.entry import Lexeme, LexemeTag
from app.models.verb import Tag
from app.schemas.tag import LexemeTagRead, TagCreate, TagRead

router = APIRouter(tags=["tags"])


@router.get("/api/tags", response_model=list[TagRead])
def list_tags(db: Session = Depends(get_db)):
    return db.execute(select(Tag).order_by(Tag.name)).scalars().all()


@router.post("/api/tags", response_model=TagRead, status_code=201)
def create_tag(data: TagCreate, db: Session = Depends(get_db)):
    existing = db.execute(select(Tag).where(Tag.name == data.name)).scalar_one_or_none()
    if existing:
        return existing
    tag = Tag(name=data.name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/api/tags/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = get_or_404(db, Tag, tag_id)
    db.delete(tag)
    db.commit()


@router.get("/api/lexeme-tags", response_model=list[LexemeTagRead])
def list_lexeme_tags(db: Session = Depends(get_db)):
    return db.execute(select(LexemeTag)).scalars().all()


@router.get("/api/lexemes/{lexeme_id}/tags", response_model=list[TagRead])
def get_lexeme_tags(lexeme_id: int, db: Session = Depends(get_db)):
    get_or_404(db, Lexeme, lexeme_id)
    return db.execute(
        select(Tag)
        .join(LexemeTag, Tag.id == LexemeTag.tag_id)
        .where(LexemeTag.lexeme_id == lexeme_id)
        .order_by(Tag.name)
    ).scalars().all()


@router.post("/api/lexemes/{lexeme_id}/tags/{tag_id}", status_code=201)
def add_lexeme_tag(lexeme_id: int, tag_id: int, db: Session = Depends(get_db)):
    get_or_404(db, Lexeme, lexeme_id)
    get_or_404(db, Tag, tag_id)
    existing = db.execute(
        select(LexemeTag).where(LexemeTag.lexeme_id == lexeme_id, LexemeTag.tag_id == tag_id)
    ).scalar_one_or_none()
    if not existing:
        db.add(LexemeTag(lexeme_id=lexeme_id, tag_id=tag_id))
        db.commit()


@router.delete("/api/lexemes/{lexeme_id}/tags/{tag_id}", status_code=204)
def remove_lexeme_tag(lexeme_id: int, tag_id: int, db: Session = Depends(get_db)):
    lt = db.execute(
        select(LexemeTag).where(LexemeTag.lexeme_id == lexeme_id, LexemeTag.tag_id == tag_id)
    ).scalar_one_or_none()
    if lt:
        db.delete(lt)
        db.commit()
