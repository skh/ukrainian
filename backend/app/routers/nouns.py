from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entry import Lexeme, LexemeForm
from app.routers._forms import replace_lexeme_forms
from app.schemas.entry import LexemeCreate, LexemeFormCreate, LexemeRead, LexemeUpdate, WordCreate

router = APIRouter()


@router.get("/api/nouns", response_model=list[LexemeRead])
def list_nouns(with_forms: bool = False, db: Session = Depends(get_db)):
    entries = db.execute(
        select(Lexeme).where(Lexeme.pos == 'noun').order_by(Lexeme.lemma)
    ).scalars().all()
    if not with_forms:
        for e in entries:
            e.forms = []
    return entries


@router.get("/api/nouns/{noun_id}", response_model=LexemeRead)
def get_noun(noun_id: int, db: Session = Depends(get_db)):
    entry = db.execute(
        select(Lexeme).where(Lexeme.id == noun_id, Lexeme.pos == 'noun')
    ).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Noun not found")
    return entry


@router.post("/api/nouns", response_model=LexemeRead, status_code=201)
def create_noun(data: LexemeCreate, db: Session = Depends(get_db)):
    existing = db.execute(
        select(Lexeme).where(Lexeme.accented == data.accented)
    ).scalar_one_or_none()
    if existing:
        is_stub = existing.pos == 'noun' and existing.gender is None and not existing.forms
        if not is_stub:
            raise HTTPException(
                status_code=409,
                detail={"message": "Entry already exists", "id": existing.id},
            )
        existing.lemma = data.lemma
        existing.accented = data.accented
        existing.gender = data.gender
        existing.number_type = data.number_type
        db.commit()
        db.refresh(existing)
        return existing

    entry = Lexeme(
        pos='noun',
        lemma=data.lemma,
        accented=data.accented,
        gender=data.gender,
        number_type=data.number_type,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/api/nouns/{noun_id}", response_model=LexemeRead)
def update_noun(noun_id: int, data: LexemeUpdate, db: Session = Depends(get_db)):
    entry = db.execute(
        select(Lexeme).where(Lexeme.id == noun_id, Lexeme.pos == 'noun')
    ).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Noun not found")
    if data.lemma is not None:
        entry.lemma = data.lemma
    if data.accented is not None:
        entry.accented = data.accented
    entry.gender = data.gender
    entry.number_type = data.number_type
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/api/nouns/{noun_id}/forms", response_model=LexemeRead)
def replace_forms(noun_id: int, forms: list[LexemeFormCreate], db: Session = Depends(get_db)):
    entry = db.execute(
        select(Lexeme).where(Lexeme.id == noun_id, Lexeme.pos == 'noun')
    ).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Noun not found")
    replace_lexeme_forms(noun_id, forms, db)
    db.refresh(entry)
    return entry


@router.get("/api/words", response_model=list[LexemeRead])
def list_words(db: Session = Depends(get_db)):
    from sqlalchemy.orm import selectinload
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


@router.delete("/api/nouns/{noun_id}", status_code=204)
def delete_noun(noun_id: int, db: Session = Depends(get_db)):
    entry = db.execute(
        select(Lexeme).where(Lexeme.id == noun_id, Lexeme.pos == 'noun')
    ).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Noun not found")
    db.delete(entry)
    db.commit()
