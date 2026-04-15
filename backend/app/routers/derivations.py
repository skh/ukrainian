from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.verb import Derivation
from app.schemas.derivation import DerivationCreate, DerivationRead, DerivationUpdate

router = APIRouter(prefix="/api/derivations", tags=["derivations"])


@router.get("", response_model=list[DerivationRead])
def list_derivations(db: Session = Depends(get_db)):
    return db.execute(select(Derivation)).scalars().all()


@router.get("/affixes", response_model=list[str])
def list_affixes(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Derivation.value)
        .where(Derivation.type.in_(["prefix", "suffix"]))
        .where(Derivation.value.isnot(None))
        .distinct()
        .order_by(Derivation.value)
    ).scalars().all()
    return rows


@router.post("", response_model=DerivationRead, status_code=201)
def create_derivation(data: DerivationCreate, db: Session = Depends(get_db)):
    derivation = Derivation(**data.model_dump())
    db.add(derivation)
    db.commit()
    db.refresh(derivation)
    return derivation


@router.put("/{derivation_id}", response_model=DerivationRead)
def update_derivation(derivation_id: int, data: DerivationUpdate, db: Session = Depends(get_db)):
    derivation = get_or_404(db, Derivation, derivation_id)
    derivation.type = data.type
    derivation.value = data.value
    db.commit()
    db.refresh(derivation)
    return derivation


@router.delete("/{derivation_id}", status_code=204)
def delete_derivation(derivation_id: int, db: Session = Depends(get_db)):
    derivation = get_or_404(db, Derivation, derivation_id)
    db.delete(derivation)
    db.commit()
