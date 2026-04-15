import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.crud import get_or_404
from app.database import get_db
from app.models.chunk import Chunk, ChunkLink, ChunkTag, ChunkTranslation
from app.models.verb import Tag
from app.models.entry import Lexeme, LexemeForm
from app.models.verb import AspectPair, Verb
from app.schemas.chunk import (
    ChunkCreate,
    ChunkLinkRead,
    ChunkLinkWrite,
    ChunkRead,
    ChunkTranslationUpdate,
    ChunkTranslationWrite,
    ChunkUpdate,
    SuggestedLink,
)
from app.utils import strip_accent

router = APIRouter(tags=["chunks"])


# ── helpers ───────────────────────────────────────────────────────────────────


def _chunk_query():
    """Base query that eagerly loads translations, links (with lexeme → pair → verbs), and tags."""
    link_chain = selectinload(Chunk.links).selectinload(ChunkLink.lexeme)
    return select(Chunk).options(
        selectinload(Chunk.translations),
        link_chain.selectinload(Lexeme.pair).selectinload(AspectPair.ipf_verb),
        link_chain.selectinload(Lexeme.pair).selectinload(AspectPair.pf_verb),
        selectinload(Chunk.chunk_tags).selectinload(ChunkTag.tag),
    )


def _to_chunk_read(chunk: Chunk) -> ChunkRead:
    links = []
    for lnk in chunk.links:
        lex = lnk.lexeme
        pair_id = None
        pair_label = None
        entry_id = None
        entry_gender = None
        if lex:
            pair_id = lex.pair_id
            if lex.pair_id is None:
                # non-pair lexeme: entry_id == lexeme_id (for backwards compat)
                entry_id = lnk.lexeme_id
                entry_gender = lex.gender
            if lex.pair:
                parts = [
                    v.accented for v in [lex.pair.ipf_verb, lex.pair.pf_verb] if v
                ]
                pair_label = ' / '.join(parts) if parts else lex.accented
        links.append(ChunkLinkRead(
            id=lnk.id,
            chunk_id=lnk.chunk_id,
            lexeme_id=lnk.lexeme_id,
            lexeme_pos=lex.pos if lex else None,
            lexeme_form=lex.accented if lex else None,
            pair_id=pair_id,
            pair_label=pair_label,
            entry_id=entry_id,
            entry_gender=entry_gender,
        ))
    tags = [ct.tag for ct in chunk.chunk_tags if ct.tag]
    return ChunkRead(
        id=chunk.id,
        lang=chunk.lang,
        text=chunk.text,
        notes=chunk.notes,
        translations=chunk.translations,
        links=links,
        tags=tags,
    )


# ── suggest-links — must be registered BEFORE /{chunk_id} ────────────────────

@router.get("/api/chunks/suggest-links", response_model=list[SuggestedLink])
def suggest_links(text: str, db: Session = Depends(get_db)):
    """
    Tokenise text, match each token against all known word forms in the DB,
    and return candidate lexeme backlinks.
    """
    tokens = set(
        strip_accent(tok).lower()
        for tok in re.split(r"[\s,;.!?\"'()\[\]«»—–\-~/]+", text)
        if len(tok) > 1
    )
    if not tokens:
        return []

    seen_lexeme_ids: set[int] = set()
    results: list[SuggestedLink] = []

    # verb inflected forms
    for vf in db.execute(select(LexemeForm).where(LexemeForm.verb_id.isnot(None))).scalars().all():
        if strip_accent(vf.form).lower() not in tokens:
            continue
        pair = db.execute(
            select(AspectPair).where(
                (AspectPair.ipf_verb_id == vf.verb_id) | (AspectPair.pf_verb_id == vf.verb_id)
            )
        ).scalars().first()
        if not pair:
            continue
        lex = db.execute(select(Lexeme).where(Lexeme.pair_id == pair.id)).scalar_one_or_none()
        if lex and lex.id not in seen_lexeme_ids:
            seen_lexeme_ids.add(lex.id)
            results.append(SuggestedLink(lexeme_id=lex.id, lexeme_pos=lex.pos,
                                          lexeme_form=lex.accented, matched_form=vf.form))

    # verb infinitives
    for v in db.execute(select(Verb)).scalars().all():
        if strip_accent(v.infinitive).lower() not in tokens:
            continue
        pair = db.execute(
            select(AspectPair).where(
                (AspectPair.ipf_verb_id == v.id) | (AspectPair.pf_verb_id == v.id)
            )
        ).scalars().first()
        if not pair:
            continue
        lex = db.execute(select(Lexeme).where(Lexeme.pair_id == pair.id)).scalar_one_or_none()
        if lex and lex.id not in seen_lexeme_ids:
            seen_lexeme_ids.add(lex.id)
            results.append(SuggestedLink(lexeme_id=lex.id, lexeme_pos=lex.pos,
                                          lexeme_form=lex.accented, matched_form=v.infinitive))

    # lexeme inflected forms (nouns/pronouns/numerals)
    for lf in db.execute(select(LexemeForm).where(LexemeForm.lexeme_id.isnot(None))).scalars().all():
        if strip_accent(lf.form).lower() not in tokens:
            continue
        if lf.lexeme_id not in seen_lexeme_ids:
            lex = db.get(Lexeme, lf.lexeme_id)
            if lex:
                seen_lexeme_ids.add(lex.id)
                results.append(SuggestedLink(lexeme_id=lex.id, lexeme_pos=lex.pos,
                                              lexeme_form=lex.accented, matched_form=lf.form))

    # lexeme lemmas/accented forms
    for lex in db.execute(select(Lexeme).where(Lexeme.pos != 'pair')).scalars().all():
        for candidate in [lex.lemma, strip_accent(lex.accented)]:
            if candidate.lower() not in tokens:
                continue
            if lex.id not in seen_lexeme_ids:
                seen_lexeme_ids.add(lex.id)
                results.append(SuggestedLink(lexeme_id=lex.id, lexeme_pos=lex.pos,
                                              lexeme_form=lex.accented, matched_form=lex.lemma))
            break

    return results


# ── chunk CRUD ────────────────────────────────────────────────────────────────

@router.get("/api/chunks", response_model=list[ChunkRead])
def list_chunks(db: Session = Depends(get_db)):
    chunks = db.execute(_chunk_query().order_by(Chunk.id)).scalars().all()
    return [_to_chunk_read(c) for c in chunks]


@router.get("/api/chunks/{chunk_id}", response_model=ChunkRead)
def get_chunk(chunk_id: int, db: Session = Depends(get_db)):
    chunk = db.execute(_chunk_query().where(Chunk.id == chunk_id)).scalar_one_or_none()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")
    return _to_chunk_read(chunk)


@router.post("/api/chunks", response_model=ChunkRead, status_code=201)
def create_chunk(data: ChunkCreate, db: Session = Depends(get_db)):
    chunk = Chunk(lang=data.lang, text=data.text.strip(), notes=data.notes)
    db.add(chunk)
    db.commit()
    chunk = db.execute(_chunk_query().where(Chunk.id == chunk.id)).scalar_one()
    return _to_chunk_read(chunk)


@router.patch("/api/chunks/{chunk_id}", response_model=ChunkRead)
def update_chunk(chunk_id: int, data: ChunkUpdate, db: Session = Depends(get_db)):
    chunk = db.execute(_chunk_query().where(Chunk.id == chunk_id)).scalar_one_or_none()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")
    if data.lang is not None:
        chunk.lang = data.lang
    if data.text is not None:
        chunk.text = data.text.strip()
    if data.notes is not None:
        chunk.notes = data.notes
    db.commit()
    chunk = db.execute(_chunk_query().where(Chunk.id == chunk_id)).scalar_one()
    return _to_chunk_read(chunk)


@router.delete("/api/chunks/{chunk_id}", status_code=204)
def delete_chunk(chunk_id: int, db: Session = Depends(get_db)):
    chunk = get_or_404(db, Chunk, chunk_id)
    db.delete(chunk)
    db.commit()


# ── translations ──────────────────────────────────────────────────────────────

@router.post("/api/chunks/{chunk_id}/translations", response_model=ChunkRead, status_code=201)
def add_translation(chunk_id: int, data: ChunkTranslationWrite, db: Session = Depends(get_db)):
    if not db.execute(select(Chunk.id).where(Chunk.id == chunk_id)).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Chunk not found")
    db.add(ChunkTranslation(chunk_id=chunk_id, lang=data.lang, text=data.text.strip()))
    db.commit()
    return _to_chunk_read(db.execute(_chunk_query().where(Chunk.id == chunk_id)).scalar_one())


@router.put("/api/chunk-translations/{translation_id}", response_model=ChunkRead)
def update_translation(translation_id: int, data: ChunkTranslationUpdate, db: Session = Depends(get_db)):
    t = get_or_404(db, ChunkTranslation, translation_id)
    t.text = data.text.strip()
    db.commit()
    return _to_chunk_read(db.execute(_chunk_query().where(Chunk.id == t.chunk_id)).scalar_one())


@router.delete("/api/chunk-translations/{translation_id}", status_code=204)
def delete_translation(translation_id: int, db: Session = Depends(get_db)):
    t = get_or_404(db, ChunkTranslation, translation_id)
    db.delete(t)
    db.commit()


# ── links ─────────────────────────────────────────────────────────────────────

@router.post("/api/chunks/{chunk_id}/links", response_model=ChunkRead, status_code=201)
def add_link(chunk_id: int, data: ChunkLinkWrite, db: Session = Depends(get_db)):
    if not db.execute(select(Chunk.id).where(Chunk.id == chunk_id)).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Chunk not found")
    existing = db.execute(
        select(ChunkLink).where(ChunkLink.chunk_id == chunk_id, ChunkLink.lexeme_id == data.lexeme_id)
    ).scalar_one_or_none()
    if not existing:
        db.add(ChunkLink(chunk_id=chunk_id, lexeme_id=data.lexeme_id))
        db.commit()
    return _to_chunk_read(db.execute(_chunk_query().where(Chunk.id == chunk_id)).scalar_one())


@router.delete("/api/chunk-links/{link_id}", status_code=204)
def delete_link(link_id: int, db: Session = Depends(get_db)):
    link = get_or_404(db, ChunkLink, link_id)
    db.delete(link)
    db.commit()


# ── tags ──────────────────────────────────────────────────────────────────────

@router.post("/api/chunks/{chunk_id}/tags/{tag_id}", response_model=ChunkRead, status_code=201)
def add_chunk_tag(chunk_id: int, tag_id: int, db: Session = Depends(get_db)):
    get_or_404(db, Chunk, chunk_id)
    get_or_404(db, Tag, tag_id)
    existing = db.execute(
        select(ChunkTag).where(ChunkTag.chunk_id == chunk_id, ChunkTag.tag_id == tag_id)
    ).scalar_one_or_none()
    if not existing:
        db.add(ChunkTag(chunk_id=chunk_id, tag_id=tag_id))
        db.commit()
    return _to_chunk_read(db.execute(_chunk_query().where(Chunk.id == chunk_id)).scalar_one())


@router.delete("/api/chunks/{chunk_id}/tags/{tag_id}", status_code=204)
def remove_chunk_tag(chunk_id: int, tag_id: int, db: Session = Depends(get_db)):
    ct = db.execute(
        select(ChunkTag).where(ChunkTag.chunk_id == chunk_id, ChunkTag.tag_id == tag_id)
    ).scalar_one_or_none()
    if ct:
        db.delete(ct)
        db.commit()


# ── pair convenience ──────────────────────────────────────────────────────────

@router.get("/api/pairs/{pair_id}/chunks", response_model=list[ChunkRead])
def list_chunks_for_pair(pair_id: int, db: Session = Depends(get_db)):
    """Return all chunks linked to the lexeme associated with this aspect pair."""
    get_or_404(db, AspectPair, pair_id)
    lex = db.execute(select(Lexeme).where(Lexeme.pair_id == pair_id)).scalar_one_or_none()
    if not lex:
        return []
    chunk_ids = db.execute(
        select(ChunkLink.chunk_id).where(ChunkLink.lexeme_id == lex.id)
    ).scalars().all()
    if not chunk_ids:
        return []
    chunks = db.execute(
        _chunk_query().where(Chunk.id.in_(chunk_ids)).order_by(Chunk.id)
    ).scalars().all()
    return [_to_chunk_read(c) for c in chunks]
