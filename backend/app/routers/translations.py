import os

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.verb import AspectPair, Collocation, CollocTranslation, PairTranslation

router = APIRouter(tags=["translations"])


def configured_langs() -> list[str]:
    raw = os.getenv("TRANSLATION_LANGUAGES", "en,de")
    return [l.strip() for l in raw.split(",") if l.strip()]


class TranslationRead(BaseModel):
    id: int
    pair_id: int
    lang: str
    text: str
    model_config = {"from_attributes": True}


class CollocTranslationRead(BaseModel):
    id: int
    collocation_id: int
    lang: str
    text: str
    model_config = {"from_attributes": True}


class TranslationWrite(BaseModel):
    lang: str
    text: str


class TranslationUpdate(BaseModel):
    text: str


@router.get("/api/languages", response_model=list[str])
def list_languages():
    return configured_langs()


@router.get("/api/pair-translations", response_model=list[TranslationRead])
def list_all_pair_translations(db: Session = Depends(get_db)):
    return db.execute(select(PairTranslation).order_by(PairTranslation.pair_id, PairTranslation.lang)).scalars().all()


# --- Pair translations ---

@router.get("/api/pairs/{pair_id}/translations", response_model=list[TranslationRead])
def get_pair_translations(pair_id: int, db: Session = Depends(get_db)):
    get_or_404(db, AspectPair, pair_id)
    return db.execute(
        select(PairTranslation)
        .where(PairTranslation.pair_id == pair_id)
        .order_by(PairTranslation.lang, PairTranslation.id)
    ).scalars().all()


@router.post("/api/pairs/{pair_id}/translations", response_model=TranslationRead, status_code=201)
def create_pair_translation(pair_id: int, data: TranslationWrite, db: Session = Depends(get_db)):
    get_or_404(db, AspectPair, pair_id)
    t = PairTranslation(pair_id=pair_id, lang=data.lang, text=data.text.strip())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/api/pair-translations/{translation_id}", response_model=TranslationRead)
def update_pair_translation(translation_id: int, data: TranslationUpdate, db: Session = Depends(get_db)):
    t = get_or_404(db, PairTranslation, translation_id)
    t.text = data.text.strip()
    db.commit()
    db.refresh(t)
    return t


@router.delete("/api/pair-translations/{translation_id}", status_code=204)
def delete_pair_translation(translation_id: int, db: Session = Depends(get_db)):
    t = get_or_404(db, PairTranslation, translation_id)
    db.delete(t)
    db.commit()


# --- Collocation translations ---

@router.get("/api/pairs/{pair_id}/collocation-translations", response_model=list[CollocTranslationRead])
def get_pair_colloc_translations(pair_id: int, db: Session = Depends(get_db)):
    """All collocation translations for all collocations belonging to this pair."""
    colloc_ids = db.execute(
        select(Collocation.id).where(Collocation.pair_id == pair_id)
    ).scalars().all()
    if not colloc_ids:
        return []
    return db.execute(
        select(CollocTranslation)
        .where(CollocTranslation.collocation_id.in_(colloc_ids))
        .order_by(CollocTranslation.collocation_id, CollocTranslation.lang, CollocTranslation.id)
    ).scalars().all()


@router.post("/api/collocations/{collocation_id}/translations", response_model=CollocTranslationRead, status_code=201)
def create_colloc_translation(collocation_id: int, data: TranslationWrite, db: Session = Depends(get_db)):
    get_or_404(db, Collocation, collocation_id)
    t = CollocTranslation(collocation_id=collocation_id, lang=data.lang, text=data.text.strip())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/api/colloc-translations/{translation_id}", response_model=CollocTranslationRead)
def update_colloc_translation(translation_id: int, data: TranslationUpdate, db: Session = Depends(get_db)):
    t = get_or_404(db, CollocTranslation, translation_id)
    t.text = data.text.strip()
    db.commit()
    db.refresh(t)
    return t


@router.delete("/api/colloc-translations/{translation_id}", status_code=204)
def delete_colloc_translation(translation_id: int, db: Session = Depends(get_db)):
    t = get_or_404(db, CollocTranslation, translation_id)
    db.delete(t)
    db.commit()
