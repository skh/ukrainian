from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.verb import Verb, VerbForm
from app.schemas.verb_form import VerbFormRead, VerbFormsBulkCreate

router = APIRouter(prefix="/api/verb-forms", tags=["verb-forms"])


@router.get("", response_model=list[VerbFormRead])
def list_all_verb_forms(db: Session = Depends(get_db)):
    return db.execute(select(VerbForm)).scalars().all()


@router.get("/{verb_id}", response_model=list[VerbFormRead])
def get_verb_forms(verb_id: int, db: Session = Depends(get_db)):
    verb = get_or_404(db, Verb, verb_id)
    return verb.forms


@router.post("", response_model=list[VerbFormRead], status_code=201)
def create_verb_forms(data: VerbFormsBulkCreate, db: Session = Depends(get_db)):
    verb = get_or_404(db, Verb, data.verb_id)
    created = []
    for f in data.forms:
        row = VerbForm(verb_id=data.verb_id, **f.model_dump())
        db.add(row)
        created.append(row)
    db.commit()
    for row in created:
        db.refresh(row)
    return created


@router.delete("/{verb_id}", status_code=204)
def delete_verb_forms(verb_id: int, db: Session = Depends(get_db)):
    verb = get_or_404(db, Verb, verb_id)
    for f in verb.forms:
        db.delete(f)
    db.commit()
