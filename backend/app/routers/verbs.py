from fastapi import APIRouter, Depends
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.verb import AspectPair, Derivation, Verb
from app.schemas.verb import VerbCreate, VerbRead, VerbUpdate

router = APIRouter(prefix="/api/verbs", tags=["verbs"])


@router.get("", response_model=list[VerbRead])
def list_verbs(db: Session = Depends(get_db)):
    return db.execute(select(Verb)).scalars().all()


@router.get("/{verb_id}", response_model=VerbRead)
def get_verb(verb_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, Verb, verb_id)


@router.post("", response_model=VerbRead, status_code=201)
def create_verb(data: VerbCreate, db: Session = Depends(get_db)):
    verb = Verb(**data.model_dump())
    db.add(verb)
    db.commit()
    db.refresh(verb)
    return verb


@router.put("/{verb_id}", response_model=VerbRead)
def update_verb(verb_id: int, data: VerbUpdate, db: Session = Depends(get_db)):
    verb = get_or_404(db, Verb, verb_id)
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(verb, key, value)
    db.commit()
    db.refresh(verb)
    return verb


@router.delete("/{verb_id}", status_code=204)
def delete_verb(verb_id: int, db: Session = Depends(get_db)):
    verb = get_or_404(db, Verb, verb_id)
    for pair in db.execute(
        select(AspectPair).where(or_(AspectPair.ipf_verb_id == verb_id, AspectPair.pf_verb_id == verb_id))
    ).scalars().all():
        db.delete(pair)
    for deriv in db.execute(
        select(Derivation).where(or_(Derivation.source_verb_id == verb_id, Derivation.derived_verb_id == verb_id))
    ).scalars().all():
        db.delete(deriv)
    db.delete(verb)
    db.commit()
