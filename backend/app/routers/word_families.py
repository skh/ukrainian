from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.crud import get_or_404
from app.database import get_db
from app.models.verb import AspectPair
from app.models.entry import Lexeme
from app.models.word_family import WordFamily, WordFamilyMember
from app.schemas.entry import LexemeRead
from app.schemas.word_family import WFLexemeCreate, WordFamilyRead

router = APIRouter(tags=["word-families"])


def _load_family(db: Session, family_id: int) -> WordFamily:
    family = db.execute(
        select(WordFamily)
        .where(WordFamily.id == family_id)
        .options(
            selectinload(WordFamily.members)
            .selectinload(WordFamilyMember.lexeme)
            .selectinload(Lexeme.pair)
        )
    ).scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=404, detail="WordFamily not found")
    return family


def _family_read(family: WordFamily) -> WordFamilyRead:
    return WordFamilyRead(
        id=family.id,
        members=[LexemeRead.model_validate(m.lexeme) for m in family.members],
    )


@router.get("/api/word-families", response_model=list[WordFamilyRead])
def list_word_families(db: Session = Depends(get_db)):
    families = db.execute(
        select(WordFamily).options(
            selectinload(WordFamily.members)
            .selectinload(WordFamilyMember.lexeme)
            .selectinload(Lexeme.pair)
        )
    ).scalars().all()
    return [_family_read(f) for f in families]


@router.get("/api/word-families/{family_id}", response_model=WordFamilyRead)
def get_word_family(family_id: int, db: Session = Depends(get_db)):
    return _family_read(_load_family(db, family_id))


@router.post("/api/word-families", response_model=WordFamilyRead, status_code=201)
def create_word_family(db: Session = Depends(get_db)):
    family = WordFamily()
    db.add(family)
    db.commit()
    db.refresh(family)
    return WordFamilyRead(id=family.id, members=[])


@router.delete("/api/word-families/{family_id}", status_code=204)
def delete_word_family(family_id: int, db: Session = Depends(get_db)):
    family = get_or_404(db, WordFamily, family_id)
    db.delete(family)
    db.commit()


@router.post("/api/word-families/{family_id}/members/{lexeme_id}", response_model=WordFamilyRead, status_code=201)
def add_member(family_id: int, lexeme_id: int, db: Session = Depends(get_db)):
    family = get_or_404(db, WordFamily, family_id)
    lexeme = get_or_404(db, Lexeme, lexeme_id)
    existing = db.get(WordFamilyMember, (family_id, lexeme_id))
    if existing:
        raise HTTPException(status_code=409, detail="Already a member")
    db.add(WordFamilyMember(family_id=family.id, lexeme_id=lexeme.id))
    db.commit()
    return _family_read(_load_family(db, family_id))


@router.delete("/api/word-families/{family_id}/members/{lexeme_id}", response_model=WordFamilyRead)
def remove_member(family_id: int, lexeme_id: int, db: Session = Depends(get_db)):
    member = db.get(WordFamilyMember, (family_id, lexeme_id))
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return _family_read(_load_family(db, family_id))


@router.post("/api/word-families/{family_id}/lexemes", response_model=LexemeRead, status_code=201)
def create_and_add_lexeme(family_id: int, data: WFLexemeCreate, db: Session = Depends(get_db)):
    family = get_or_404(db, WordFamily, family_id)
    lemma = data.accented.replace('\u0301', '')
    lexeme = Lexeme(pos=data.pos, lemma=lemma, accented=data.accented)
    db.add(lexeme)
    db.commit()
    db.refresh(lexeme)
    db.add(WordFamilyMember(family_id=family.id, lexeme_id=lexeme.id))
    db.commit()
    return lexeme


@router.get("/api/pairs/{pair_id}/word-families", response_model=list[WordFamilyRead])
def families_for_pair(pair_id: int, db: Session = Depends(get_db)):
    get_or_404(db, AspectPair, pair_id)
    lexeme = db.execute(
        select(Lexeme).where(Lexeme.pair_id == pair_id)
    ).scalar_one_or_none()
    if not lexeme:
        return []
    family_ids = [m.family_id for m in db.execute(
        select(WordFamilyMember).where(WordFamilyMember.lexeme_id == lexeme.id)
    ).scalars().all()]
    if not family_ids:
        return []
    families = db.execute(
        select(WordFamily)
        .where(WordFamily.id.in_(family_ids))
        .options(
            selectinload(WordFamily.members)
            .selectinload(WordFamilyMember.lexeme)
            .selectinload(Lexeme.pair)
        )
    ).scalars().all()
    return [_family_read(f) for f in families]
