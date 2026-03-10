from fastapi import HTTPException
from sqlalchemy.orm import Session


def get_or_404(db: Session, model, id: int) -> object:
    obj = db.get(model, id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return obj
