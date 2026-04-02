from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entry import Lexeme, LexemeForm
from app.routers._forms import replace_lexeme_forms
from app.schemas.entry import DeclinableCreate, LexemeFormCreate, LexemeRead

_DECLINABLE_POS = ('adjective', 'pronoun', 'numeral')


def _make_router(pos: str) -> APIRouter:
    plural = f"{pos}s"
    router = APIRouter(tags=[plural])

    @router.get(f"/api/{plural}", response_model=list[LexemeRead], operation_id=f"list_{plural}")
    def list_items(db: Session = Depends(get_db)):
        return db.execute(
            select(Lexeme).where(Lexeme.pos == pos).order_by(Lexeme.lemma)
        ).scalars().all()

    @router.get(f"/api/{plural}/{{item_id}}", response_model=LexemeRead, operation_id=f"get_{pos}")
    def get_item(item_id: int, db: Session = Depends(get_db)):
        item = db.execute(
            select(Lexeme).where(Lexeme.id == item_id, Lexeme.pos == pos)
        ).scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail=f"{pos.capitalize()} not found")
        return item

    @router.post(f"/api/{plural}", response_model=LexemeRead, status_code=201, operation_id=f"create_{pos}")
    def create_item(data: DeclinableCreate, db: Session = Depends(get_db)):
        existing = db.execute(
            select(Lexeme).where(Lexeme.accented == data.accented)
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=409,
                detail={"message": "Entry already exists", "id": existing.id},
            )
        lemma = data.accented.replace('\u0301', '')
        item = Lexeme(
            pos=pos, lemma=lemma, accented=data.accented,
            gender=data.gender, number_type=data.number_type,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @router.patch(f"/api/{plural}/{{item_id}}", response_model=LexemeRead, operation_id=f"update_{pos}")
    def update_item(item_id: int, data: DeclinableCreate, db: Session = Depends(get_db)):
        item = db.execute(
            select(Lexeme).where(Lexeme.id == item_id, Lexeme.pos == pos)
        ).scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail=f"{pos.capitalize()} not found")
        item.accented = data.accented
        item.lemma = data.accented.replace('\u0301', '')
        item.gender = data.gender
        item.number_type = data.number_type
        db.commit()
        db.refresh(item)
        return item

    @router.put(f"/api/{plural}/{{item_id}}/forms", response_model=LexemeRead, operation_id=f"replace_{pos}_forms")
    def replace_forms(item_id: int, forms: list[LexemeFormCreate], db: Session = Depends(get_db)):
        item = db.execute(
            select(Lexeme).where(Lexeme.id == item_id, Lexeme.pos == pos)
        ).scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail=f"{pos.capitalize()} not found")
        replace_lexeme_forms(item_id, forms, db)
        db.refresh(item)
        return item

    @router.delete(f"/api/{plural}/{{item_id}}", status_code=204, operation_id=f"delete_{pos}")
    def delete_item(item_id: int, db: Session = Depends(get_db)):
        item = db.execute(
            select(Lexeme).where(Lexeme.id == item_id, Lexeme.pos == pos)
        ).scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail=f"{pos.capitalize()} not found")
        db.delete(item)
        db.commit()

    return router


adjective_router = _make_router('adjective')
pronoun_router   = _make_router('pronoun')
numeral_router   = _make_router('numeral')
