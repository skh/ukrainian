from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.entry import Lexeme
from app.schemas.entry import LexemeRead, WordCreate

router = APIRouter()


@router.get("/api/words", response_model=list[LexemeRead])
def list_words(db: Session = Depends(get_db)):
    entries = db.execute(
        select(Lexeme).options(selectinload(Lexeme.pair)).order_by(Lexeme.lemma)
    ).scalars().all()
    for e in entries:
        e.forms = []
    return entries


@router.get("/api/words/{word_id}", response_model=LexemeRead)
def get_word(word_id: int, db: Session = Depends(get_db)):
    entry = db.execute(
        select(Lexeme).where(Lexeme.id == word_id, Lexeme.pos != 'noun', Lexeme.pos != 'pair')
    ).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Word not found")
    return entry


@router.post("/api/words", response_model=LexemeRead, status_code=201)
def create_word(data: WordCreate, db: Session = Depends(get_db)):
    lemma = data.accented.replace('\u0301', '')
    existing = db.execute(
        select(Lexeme).where(Lexeme.accented == data.accented)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail={"message": "Entry already exists", "id": existing.id},
        )
    entry = Lexeme(pos=data.pos, lemma=lemma, accented=data.accented)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
