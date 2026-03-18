from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entry import Entry, EntryForm
from app.models.word_family import Lexeme
from app.schemas.entry import EntryCreate, EntryFormCreate, EntryRead, EntryUpdate

router = APIRouter()


def _get_or_create_lexeme(db: Session, lemma: str) -> Lexeme:
    existing = db.execute(
        select(Lexeme).where(Lexeme.pos == 'noun', Lexeme.form == lemma)
    ).scalar_one_or_none()
    if existing:
        return existing
    lexeme = Lexeme(pos='noun', form=lemma)
    db.add(lexeme)
    db.flush()
    return lexeme


@router.get("/api/nouns", response_model=list[EntryRead])
def list_nouns(with_forms: bool = False, db: Session = Depends(get_db)):
    # Backfill: noun lexemes with no entry (never linked, or entry was deleted).
    existing_entry_ids = db.execute(select(Entry.id).where(Entry.pos == 'noun')).scalars().all()
    orphans = db.execute(
        select(Lexeme).where(
            Lexeme.pos == 'noun',
            (Lexeme.entry_id.is_(None)) | (~Lexeme.entry_id.in_(existing_entry_ids))
        )
    ).scalars().all()
    for lex in orphans:
        lex.entry_id = None  # clear dangling reference before re-creating
    for lex in orphans:
        entry = Entry(pos='noun', lemma=lex.form, accented=lex.form, number_type='both')
        db.add(entry)
        db.flush()
        lex.entry_id = entry.id
    if orphans:
        db.commit()

    entries = db.execute(
        select(Entry).where(Entry.pos == 'noun').order_by(Entry.lemma)
    ).scalars().all()
    if not with_forms:
        for e in entries:
            e.forms = []
    return entries


@router.get("/api/nouns/{noun_id}", response_model=EntryRead)
def get_noun(noun_id: int, db: Session = Depends(get_db)):
    entry = db.execute(
        select(Entry).where(Entry.id == noun_id, Entry.pos == 'noun')
    ).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Noun not found")
    return entry


@router.post("/api/nouns", response_model=EntryRead, status_code=201)
def create_noun(data: EntryCreate, db: Session = Depends(get_db)):
    lexeme = _get_or_create_lexeme(db, data.lemma)
    if lexeme.entry_id:
        existing = db.execute(
            select(Entry).where(Entry.id == lexeme.entry_id)
        ).scalar_one_or_none()
        # Stub entries (no gender, no forms) are upgraded silently — they were
        # auto-created from word-family lexemes and have no real data yet.
        is_stub = existing.gender is None and not existing.forms
        if not is_stub:
            raise HTTPException(
                status_code=409,
                detail={"message": "Noun already exists", "id": existing.id},
            )
        existing.lemma = data.lemma
        existing.accented = data.accented
        existing.gender = data.gender
        existing.number_type = data.number_type
        db.commit()
        db.refresh(existing)
        return existing

    entry = Entry(
        pos='noun',
        lemma=data.lemma,
        accented=data.accented,
        gender=data.gender,
        number_type=data.number_type,
    )
    db.add(entry)
    db.flush()
    lexeme.entry_id = entry.id
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/api/nouns/{noun_id}", response_model=EntryRead)
def update_noun(noun_id: int, data: EntryUpdate, db: Session = Depends(get_db)):
    entry = db.execute(
        select(Entry).where(Entry.id == noun_id, Entry.pos == 'noun')
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


@router.put("/api/nouns/{noun_id}/forms", response_model=EntryRead)
def replace_forms(noun_id: int, forms: list[EntryFormCreate], db: Session = Depends(get_db)):
    entry = db.execute(
        select(Entry).where(Entry.id == noun_id, Entry.pos == 'noun')
    ).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Noun not found")
    db.execute(
        EntryForm.__table__.delete().where(EntryForm.entry_id == noun_id)
    )
    for f in forms:
        db.add(EntryForm(entry_id=noun_id, tags=f.tags, form=f.form))
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/api/nouns/{noun_id}", status_code=204)
def delete_noun(noun_id: int, db: Session = Depends(get_db)):
    entry = db.execute(
        select(Entry).where(Entry.id == noun_id, Entry.pos == 'noun')
    ).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Noun not found")
    lexeme = db.execute(
        select(Lexeme).where(Lexeme.entry_id == noun_id)
    ).scalar_one_or_none()
    if lexeme:
        db.delete(lexeme)
    db.delete(entry)
    db.commit()
