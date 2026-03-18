import os

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.verb import AspectPair, PairTranslation
from app.schemas.translation import (
    PairTranslationRead,
    TranslationUpdate,
    TranslationWrite,
)

router = APIRouter(tags=["translations"])


def configured_langs() -> list[str]:
    raw = os.getenv("TRANSLATION_LANGUAGES", "en,de")
    return [l.strip() for l in raw.split(",") if l.strip()]


@router.get("/api/languages", response_model=list[str])
def list_languages():
    return configured_langs()


@router.get("/api/pair-translations", response_model=list[PairTranslationRead])
def list_all_pair_translations(db: Session = Depends(get_db)):
    return db.execute(select(PairTranslation).order_by(PairTranslation.pair_id, PairTranslation.lang)).scalars().all()


# --- Pair translations ---

@router.get("/api/pairs/{pair_id}/translations", response_model=list[PairTranslationRead])
def get_pair_translations(pair_id: int, db: Session = Depends(get_db)):
    get_or_404(db, AspectPair, pair_id)
    return db.execute(
        select(PairTranslation)
        .where(PairTranslation.pair_id == pair_id)
        .order_by(PairTranslation.lang, PairTranslation.id)
    ).scalars().all()


@router.post("/api/pairs/{pair_id}/translations", response_model=PairTranslationRead, status_code=201)
def create_pair_translation(pair_id: int, data: TranslationWrite, db: Session = Depends(get_db)):
    get_or_404(db, AspectPair, pair_id)
    t = PairTranslation(pair_id=pair_id, lang=data.lang, text=data.text.strip())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/api/pair-translations/{translation_id}", response_model=PairTranslationRead)
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
