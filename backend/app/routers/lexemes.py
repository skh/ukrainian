from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.entry import Lexeme
from app.schemas.entry import LexemeRead, LexemeUpdate

router = APIRouter(prefix="/api/lexemes", tags=["lexemes"])


@router.get("", response_model=list[LexemeRead])
def list_lexemes(db: Session = Depends(get_db)):
    return db.execute(select(Lexeme)).scalars().all()


@router.put("/{lexeme_id}", response_model=LexemeRead)
def update_lexeme(lexeme_id: int, data: LexemeUpdate, db: Session = Depends(get_db)):
    lexeme = get_or_404(db, Lexeme, lexeme_id)
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(lexeme, key, value)
    db.commit()
    db.refresh(lexeme)
    return lexeme


@router.delete("/{lexeme_id}", status_code=204)
def delete_lexeme(lexeme_id: int, db: Session = Depends(get_db)):
    lexeme = get_or_404(db, Lexeme, lexeme_id)
    db.delete(lexeme)
    db.commit()
