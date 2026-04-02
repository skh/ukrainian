from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.verb import Verb
from app.models.entry import LexemeForm
from app.schemas.verb_form import VerbFormRead, VerbFormUpdate, VerbFormCreate

router = APIRouter(prefix="/api/verbs", tags=["verb-forms"])

_TENSES  = {"present", "future", "past", "imperative"}
_PERSONS = {"1", "2", "3"}
_NUMBERS = {"singular", "plural"}
_GENDERS = {"masculine", "feminine", "neuter"}


def _encode_tags(tense: str, person, number, gender) -> str:
    return ",".join(x for x in [tense, person, number, gender] if x)


def _decode_tags(tags: str) -> dict:
    parts = tags.split(",")
    return {
        "tense":  next((p for p in parts if p in _TENSES),  None),
        "person": next((p for p in parts if p in _PERSONS), None),
        "number": next((p for p in parts if p in _NUMBERS), None),
        "gender": next((p for p in parts if p in _GENDERS), None),
    }


def _to_read(lf: LexemeForm) -> VerbFormRead:
    decoded = _decode_tags(lf.tags)
    return VerbFormRead(
        id=lf.id,
        verb_id=lf.verb_id,
        form=lf.form,
        **decoded,
    )


@router.get("/{verb_id}/forms", response_model=list[VerbFormRead])
def get_verb_forms(verb_id: int, db: Session = Depends(get_db)):
    get_or_404(db, Verb, verb_id)
    rows = db.execute(select(LexemeForm).where(LexemeForm.verb_id == verb_id)).scalars().all()
    return [_to_read(r) for r in rows]


@router.put("/{verb_id}/forms", response_model=list[VerbFormRead])
def replace_verb_forms(verb_id: int, forms: list[VerbFormCreate], db: Session = Depends(get_db)):
    get_or_404(db, Verb, verb_id)
    db.execute(LexemeForm.__table__.delete().where(LexemeForm.verb_id == verb_id))
    created = []
    for f in forms:
        tags = _encode_tags(f.tense, f.person, f.number, f.gender)
        row = LexemeForm(verb_id=verb_id, tags=tags, form=f.form)
        db.add(row)
        created.append(row)
    db.commit()
    for row in created:
        db.refresh(row)
    return [_to_read(r) for r in created]


@router.put("/{verb_id}/forms/{form_id}", response_model=VerbFormRead)
def update_verb_form(verb_id: int, form_id: int, data: VerbFormUpdate, db: Session = Depends(get_db)):
    form = get_or_404(db, LexemeForm, form_id)
    form.form = data.form
    db.commit()
    db.refresh(form)
    return _to_read(form)


@router.delete("/{verb_id}/forms", status_code=204)
def delete_verb_forms(verb_id: int, db: Session = Depends(get_db)):
    get_or_404(db, Verb, verb_id)
    db.execute(LexemeForm.__table__.delete().where(LexemeForm.verb_id == verb_id))
    db.commit()
