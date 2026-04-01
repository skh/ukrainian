import os

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.entry import Lexeme, LexemeTranslation
from app.schemas.translation import (
    LexemeTranslationRead,
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


@router.get("/api/lexeme-translations", response_model=list[LexemeTranslationRead])
def list_all_lexeme_translations(db: Session = Depends(get_db)):
    return db.execute(
        select(LexemeTranslation).order_by(LexemeTranslation.lexeme_id, LexemeTranslation.lang)
    ).scalars().all()


@router.get("/api/lexemes/{lexeme_id}/translations", response_model=list[LexemeTranslationRead])
def get_lexeme_translations(lexeme_id: int, db: Session = Depends(get_db)):
    get_or_404(db, Lexeme, lexeme_id)
    return db.execute(
        select(LexemeTranslation)
        .where(LexemeTranslation.lexeme_id == lexeme_id)
        .order_by(LexemeTranslation.lang, LexemeTranslation.id)
    ).scalars().all()


@router.post("/api/lexemes/{lexeme_id}/translations", response_model=LexemeTranslationRead, status_code=201)
def create_lexeme_translation(lexeme_id: int, data: TranslationWrite, db: Session = Depends(get_db)):
    get_or_404(db, Lexeme, lexeme_id)
    t = LexemeTranslation(lexeme_id=lexeme_id, lang=data.lang, text=data.text.strip())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/api/lexeme-translations/{translation_id}", response_model=LexemeTranslationRead)
def update_lexeme_translation(translation_id: int, data: TranslationUpdate, db: Session = Depends(get_db)):
    t = get_or_404(db, LexemeTranslation, translation_id)
    t.text = data.text.strip()
    db.commit()
    db.refresh(t)
    return t


@router.delete("/api/lexeme-translations/{translation_id}", status_code=204)
def delete_lexeme_translation(translation_id: int, db: Session = Depends(get_db)):
    t = get_or_404(db, LexemeTranslation, translation_id)
    db.delete(t)
    db.commit()
