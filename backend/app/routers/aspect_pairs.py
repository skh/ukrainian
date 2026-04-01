from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.verb import AspectPair, Verb
from app.models.entry import Lexeme
from app.schemas.aspect_pair import AspectPairAddPartner, AspectPairCreate, AspectPairRead, SoloPairCreate

router = APIRouter(prefix="/api/aspect-pairs", tags=["aspect-pairs"])


@router.get("", response_model=list[AspectPairRead])
def list_aspect_pairs(db: Session = Depends(get_db)):
    return db.execute(select(AspectPair)).scalars().all()


@router.get("/{pair_id}", response_model=AspectPairRead)
def get_aspect_pair(pair_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, AspectPair, pair_id)


@router.post("", response_model=AspectPairRead, status_code=201)
def create_aspect_pair(data: AspectPairCreate, db: Session = Depends(get_db)):
    ipf_verb = db.get(Verb, data.ipf_verb_id)
    pf_verb = db.get(Verb, data.pf_verb_id)
    if not ipf_verb or not pf_verb:
        raise HTTPException(status_code=404, detail="One or both verbs not found")
    if ipf_verb.aspect != "ipf":
        raise HTTPException(status_code=422, detail=f'Verb {data.ipf_verb_id} ("{ipf_verb.accented}") is not imperfective')
    if pf_verb.aspect != "pf":
        raise HTTPException(status_code=422, detail=f'Verb {data.pf_verb_id} ("{pf_verb.accented}") is not perfective')
    pair = AspectPair(**data.model_dump())
    db.add(pair)
    db.commit()
    db.refresh(pair)
    db.add(Lexeme(pos="pair", lemma=ipf_verb.infinitive, accented=ipf_verb.accented, pair_id=pair.id))
    db.commit()
    return pair


@router.post("/solo", response_model=AspectPairRead, status_code=201)
def create_solo_pair(data: SoloPairCreate, db: Session = Depends(get_db)):
    verb = db.get(Verb, data.verb_id)
    if not verb:
        raise HTTPException(status_code=404, detail="Verb not found")
    if verb.aspect == "ipf":
        pair = AspectPair(ipf_verb_id=verb.id, pf_verb_id=None)
    else:
        pair = AspectPair(ipf_verb_id=None, pf_verb_id=verb.id)
    db.add(pair)
    db.commit()
    db.refresh(pair)
    db.add(Lexeme(pos="pair", lemma=verb.infinitive, accented=verb.accented, pair_id=pair.id))
    db.commit()
    return pair


@router.patch("/{pair_id}", response_model=AspectPairRead)
def add_partner_to_pair(pair_id: int, data: AspectPairAddPartner, db: Session = Depends(get_db)):
    pair = get_or_404(db, AspectPair, pair_id)
    verb = db.get(Verb, data.verb_id)
    if not verb:
        raise HTTPException(status_code=404, detail="Verb not found")
    if pair.ipf_verb_id is None:
        if verb.aspect != "ipf":
            raise HTTPException(status_code=422, detail=f'Verb "{verb.accented}" is not imperfective')
        pair.ipf_verb_id = verb.id
        # Update lexeme to use ipf infinitive/accented now that we have it
        lexeme = db.execute(select(Lexeme).where(Lexeme.pair_id == pair.id)).scalar_one_or_none()
        if lexeme:
            lexeme.lemma = verb.infinitive
            lexeme.accented = verb.accented
    elif pair.pf_verb_id is None:
        if verb.aspect != "pf":
            raise HTTPException(status_code=422, detail=f'Verb "{verb.accented}" is not perfective')
        pair.pf_verb_id = verb.id
    else:
        raise HTTPException(status_code=422, detail="Pair already has both verbs")
    db.commit()
    db.refresh(pair)
    return pair


@router.delete("/{pair_id}", status_code=204)
def delete_aspect_pair(pair_id: int, db: Session = Depends(get_db)):
    pair = get_or_404(db, AspectPair, pair_id)
    db.delete(pair)
    db.commit()
