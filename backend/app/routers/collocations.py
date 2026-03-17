from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.verb import AspectPair, Collocation
from app.schemas.collocation import CollocationCreate, CollocationRead

router = APIRouter(tags=["collocations"])


@router.get("/api/pairs/{pair_id}/collocations", response_model=list[CollocationRead])
def list_collocations(pair_id: int, db: Session = Depends(get_db)):
    get_or_404(db, AspectPair, pair_id)
    return db.execute(
        select(Collocation).where(Collocation.pair_id == pair_id).order_by(Collocation.id)
    ).scalars().all()


@router.post("/api/pairs/{pair_id}/collocations", response_model=CollocationRead, status_code=201)
def create_collocation(pair_id: int, data: CollocationCreate, db: Session = Depends(get_db)):
    get_or_404(db, AspectPair, pair_id)
    c = Collocation(pair_id=pair_id, text=data.text.strip())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/api/collocations/{collocation_id}", response_model=CollocationRead)
def update_collocation(collocation_id: int, data: CollocationCreate, db: Session = Depends(get_db)):
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
