from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.verb import AspectPair, Collocation

router = APIRouter(tags=["collocations"])


class CollocationsRead(BaseModel):
    id: int
    pair_id: int
    text: str

    model_config = {"from_attributes": True}


class CollocationsCreate(BaseModel):
    text: str


@router.get("/api/pairs/{pair_id}/collocations", response_model=list[CollocationsRead])
def list_collocations(pair_id: int, db: Session = Depends(get_db)):
    get_or_404(db, AspectPair, pair_id)
    return db.execute(
        select(Collocation).where(Collocation.pair_id == pair_id).order_by(Collocation.id)
    ).scalars().all()


@router.post("/api/pairs/{pair_id}/collocations", response_model=CollocationsRead, status_code=201)
def create_collocation(pair_id: int, data: CollocationsCreate, db: Session = Depends(get_db)):
    get_or_404(db, AspectPair, pair_id)
    c = Collocation(pair_id=pair_id, text=data.text.strip())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/api/collocations/{collocation_id}", response_model=CollocationsRead)
def update_collocation(collocation_id: int, data: CollocationsCreate, db: Session = Depends(get_db)):
    c = get_or_404(db, Collocation, collocation_id)
    c.text = data.text.strip()
    db.commit()
    db.refresh(c)
    return c


@router.delete("/api/collocations/{collocation_id}", status_code=204)
def delete_collocation(collocation_id: int, db: Session = Depends(get_db)):
    c = get_or_404(db, Collocation, collocation_id)
    db.delete(c)
    db.commit()
