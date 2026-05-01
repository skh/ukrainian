from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.ref_pair import RefPair
from app.schemas.ref_pair import RefPairCreate, RefPairRead, RefPairUpdate

router = APIRouter(prefix="/api/ref-pairs", tags=["ref-pairs"])


@router.get("", response_model=list[RefPairRead])
def list_ref_pairs(q: str | None = None, db: Session = Depends(get_db)):
    stmt = select(RefPair)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(
            RefPair.ipf.ilike(like),
            RefPair.pf.ilike(like),
            RefPair.source.ilike(like),
            RefPair.notes.ilike(like),
        ))
    return db.execute(stmt.order_by(RefPair.source, RefPair.ipf, RefPair.pf)).scalars().all()


@router.post("", response_model=RefPairRead, status_code=201)
def create_ref_pair(data: RefPairCreate, db: Session = Depends(get_db)):
    if not data.ipf and not data.pf:
        raise HTTPException(422, "At least one of ipf or pf must be set")
    obj = RefPair(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{id}", response_model=RefPairRead)
def update_ref_pair(id: int, data: RefPairUpdate, db: Session = Depends(get_db)):
    obj = db.get(RefPair, id)
    if not obj:
        raise HTTPException(404)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=204)
def delete_ref_pair(id: int, db: Session = Depends(get_db)):
    obj = db.get(RefPair, id)
    if not obj:
        raise HTTPException(404)
    db.delete(obj)
    db.commit()
