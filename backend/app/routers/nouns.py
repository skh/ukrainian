from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entry import Entry, EntryForm
from app.models.word_family import Lexeme
from app.schemas.entry import EntryCreate, EntryFormCreate, EntryRead, EntryUpdate

router = APIRouter()


def _get_or_create_lexeme(db: Session, lemma: str) -> Lexeme:
    existing = db.query(Lexeme).filter(Lexeme.pos == 'noun', Lexeme.form == lemma).first()
    if existing:
        return existing
    lexeme = Lexeme(pos='noun', form=lemma)
    db.add(lexeme)
    db.flush()
    return lexeme


@router.get("/api/nouns", response_model=list[EntryRead])
def list_nouns(with_forms: bool = False, db: Session = Depends(get_db)):
    # Backfill: noun lexemes with no entry (never linked, or entry was deleted).
    existing_entry_ids = db.query(Entry.id).filter(Entry.pos == 'noun').scalar_subquery()
    orphans = (
        db.query(Lexeme)
        .filter(
            Lexeme.pos == 'noun',
            (Lexeme.entry_id.is_(None)) | (~Lexeme.entry_id.in_(existing_entry_ids))
        )
        .all()
    )
    for lex in orphans:
        lex.entry_id = None  # clear dangling reference before re-creating
    for lex in orphans:
        entry = Entry(pos='noun', lemma=lex.form, accented=lex.form, number_type='both')
        db.add(entry)
        db.flush()
        lex.entry_id = entry.id
    if orphans:
        db.commit()

    entries = db.query(Entry).filter(Entry.pos == 'noun').order_by(Entry.lemma).all()
    if not with_forms:
        for e in entries:
            e.forms = []
    return entries


@router.get("/api/nouns/{noun_id}", response_model=EntryRead)
def get_noun(noun_id: int, db: Session = Depends(get_db)):
    entry = db.query(Entry).filter(Entry.id == noun_id, Entry.pos == 'noun').first()
    if not entry:
        raise HTTPException(status_code=404, detail="Noun not found")
    return entry


@router.post("/api/nouns", response_model=EntryRead, status_code=201)
def create_noun(data: EntryCreate, db: Session = Depends(get_db)):
    lexeme = _get_or_create_lexeme(db, data.lemma)
    if lexeme.entry_id:
        existing = db.query(Entry).filter(Entry.id == lexeme.entry_id).first()
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
    entry = db.query(Entry).filter(Entry.id == noun_id, Entry.pos == 'noun').first()
    if not entry:
        raise HTTPException(status_code=404, detail="Noun not found")
    entry.gender = data.gender
    entry.number_type = data.number_type
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/api/nouns/{noun_id}/forms", response_model=EntryRead)
def replace_forms(noun_id: int, forms: list[EntryFormCreate], db: Session = Depends(get_db)):
    entry = db.query(Entry).filter(Entry.id == noun_id, Entry.pos == 'noun').first()
    if not entry:
        raise HTTPException(status_code=404, detail="Noun not found")
    db.query(EntryForm).filter(EntryForm.entry_id == noun_id).delete()
    for f in forms:
        db.add(EntryForm(entry_id=noun_id, tags=f.tags, form=f.form))
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/api/nouns/{noun_id}", status_code=204)
def delete_noun(noun_id: int, db: Session = Depends(get_db)):
    entry = db.query(Entry).filter(Entry.id == noun_id, Entry.pos == 'noun').first()
    if not entry:
        raise HTTPException(status_code=404, detail="Noun not found")
    lexeme = db.query(Lexeme).filter(Lexeme.entry_id == noun_id).first()
    if lexeme:
        db.delete(lexeme)
    db.delete(entry)
    db.commit()
