from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.verb import AspectPair, PairTag, Tag
from app.schemas.tag import PairTagRead, TagCreate, TagRead

router = APIRouter(tags=["tags"])


@router.get("/api/tags", response_model=list[TagRead])
def list_tags(db: Session = Depends(get_db)):
    return db.execute(select(Tag).order_by(Tag.name)).scalars().all()


@router.post("/api/tags", response_model=TagRead, status_code=201)
def create_tag(data: TagCreate, db: Session = Depends(get_db)):
    existing = db.execute(select(Tag).where(Tag.name == data.name)).scalar_one_or_none()
    if existing:
        return existing
    tag = Tag(name=data.name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/api/tags/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = get_or_404(db, Tag, tag_id)
    db.delete(tag)
    db.commit()


@router.get("/api/pair-tags", response_model=list[PairTagRead])
def list_pair_tags(db: Session = Depends(get_db)):
    return db.execute(select(PairTag)).scalars().all()


@router.get("/api/pairs/{pair_id}/tags", response_model=list[TagRead])
def get_pair_tags(pair_id: int, db: Session = Depends(get_db)):
    get_or_404(db, AspectPair, pair_id)
    return db.execute(
        select(Tag)
        .join(PairTag, Tag.id == PairTag.tag_id)
        .where(PairTag.pair_id == pair_id)
        .order_by(Tag.name)
    ).scalars().all()


@router.post("/api/pairs/{pair_id}/tags/{tag_id}", status_code=201)
def add_pair_tag(pair_id: int, tag_id: int, db: Session = Depends(get_db)):
    get_or_404(db, AspectPair, pair_id)
    get_or_404(db, Tag, tag_id)
    existing = db.execute(
        select(PairTag).where(PairTag.pair_id == pair_id, PairTag.tag_id == tag_id)
    ).scalar_one_or_none()
    if not existing:
        db.add(PairTag(pair_id=pair_id, tag_id=tag_id))
        db.commit()


@router.delete("/api/pairs/{pair_id}/tags/{tag_id}", status_code=204)
def remove_pair_tag(pair_id: int, tag_id: int, db: Session = Depends(get_db)):
    pt = db.execute(
        select(PairTag).where(PairTag.pair_id == pair_id, PairTag.tag_id == tag_id)
    ).scalar_one_or_none()
    if pt:
        db.delete(pt)
        db.commit()
