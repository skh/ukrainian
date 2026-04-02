"""Shared helper for replacing all lexeme_forms rows for a given lexeme_id."""
from sqlalchemy.orm import Session

from app.models.entry import LexemeForm
from app.schemas.entry import LexemeFormCreate


def replace_lexeme_forms(lexeme_id: int, forms: list[LexemeFormCreate], db: Session) -> None:
    db.execute(LexemeForm.__table__.delete().where(LexemeForm.lexeme_id == lexeme_id))
    for f in forms:
        db.add(LexemeForm(lexeme_id=lexeme_id, tags=f.tags, form=f.form))
    db.commit()
