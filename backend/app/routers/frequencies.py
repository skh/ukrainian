from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.verb import AspectPair, Verb, VerbFrequency
from app import sketchengine

router = APIRouter(tags=["frequencies"])


class FrequencyRead(BaseModel):
    id: int
    verb_id: int
    corpus: str
    ipm: float
    fetched_at: datetime

    model_config = {"from_attributes": True}


def _strip_accent(s: str) -> str:
    return s.replace("\u0301", "")


@router.get("/api/corpora", response_model=list[str])
def list_corpora():
    return sketchengine.configured_corpora()


@router.get("/api/frequencies", response_model=list[FrequencyRead])
def get_all_frequencies(db: Session = Depends(get_db)):
    return db.execute(select(VerbFrequency)).scalars().all()


@router.get("/api/pairs/{pair_id}/frequencies", response_model=list[FrequencyRead])
def get_pair_frequencies(pair_id: int, db: Session = Depends(get_db)):
    pair = get_or_404(db, AspectPair, pair_id)
    verb_ids = [vid for vid in [pair.ipf_verb_id, pair.pf_verb_id] if vid is not None]
    return db.execute(
        select(VerbFrequency)
        .where(VerbFrequency.verb_id.in_(verb_ids))
        .order_by(VerbFrequency.corpus, VerbFrequency.verb_id)
    ).scalars().all()


@router.post("/api/pairs/{pair_id}/fetch-frequency", response_model=list[FrequencyRead])
def fetch_pair_frequency(pair_id: int, corpus: str, db: Session = Depends(get_db)):
    pair = get_or_404(db, AspectPair, pair_id)

    if corpus not in sketchengine.configured_corpora():
        raise HTTPException(status_code=400, detail=f"Unknown corpus: {corpus}")

    verb_pairs = []
    for verb_id in [pair.ipf_verb_id, pair.pf_verb_id]:
        if verb_id is not None:
            v = db.get(Verb, verb_id)
            if v:
                verb_pairs.append((verb_id, v))

    try:
        verb_ipms = [(vid, sketchengine.fetch_ipm(corpus, _strip_accent(v.infinitive))) for vid, v in verb_pairs]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Sketch Engine error: {e}")

    now = datetime.now(timezone.utc)
    results = []
    for verb_id, ipm in verb_ipms:
        row = db.execute(
            select(VerbFrequency).where(
                VerbFrequency.verb_id == verb_id,
                VerbFrequency.corpus == corpus,
            )
        ).scalar_one_or_none()
        if row:
            row.ipm = ipm
            row.fetched_at = now
        else:
            row = VerbFrequency(verb_id=verb_id, corpus=corpus, ipm=ipm, fetched_at=now)
            db.add(row)
        results.append(row)

    db.commit()
    for r in results:
        db.refresh(r)
    return results
