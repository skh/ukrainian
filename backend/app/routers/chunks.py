import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.crud import get_or_404
from app.database import get_db
from app.models.chunk import Chunk, ChunkLink, ChunkTranslation
from app.models.entry import Entry, EntryForm
from app.models.verb import AspectPair, Verb, VerbForm
from app.models.word_family import Lexeme
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

router = APIRouter(tags=["chunks"])


# ── helpers ───────────────────────────────────────────────────────────────────

def _strip_accent(s: str) -> str:
    return s.replace("\u0301", "")


def _chunk_query():
    """Base query that eagerly loads translations and links (with lexeme)."""
    return select(Chunk).options(
        selectinload(Chunk.translations),
        selectinload(Chunk.links).selectinload(ChunkLink.lexeme),
    )


def _to_chunk_read(chunk: Chunk) -> ChunkRead:
    links = []
    for lnk in chunk.links:
        lex = lnk.lexeme
        links.append(ChunkLinkRead(
            id=lnk.id,
            chunk_id=lnk.chunk_id,
            lexeme_id=lnk.lexeme_id,
            lexeme_pos=lex.pos if lex else None,
            lexeme_form=lex.form if lex else None,
        ))
    return ChunkRead(
        id=chunk.id,
        lang=chunk.lang,
        text=chunk.text,
        notes=chunk.notes,
        translations=chunk.translations,
        links=links,
    )


# ── suggest-links — must be registered BEFORE /{chunk_id} ────────────────────

@router.get("/api/chunks/suggest-links", response_model=list[SuggestedLink])
def suggest_links(text: str, db: Session = Depends(get_db)):
    """
    Tokenise text, match each token against all known word forms in the DB,
    and return candidate lexeme backlinks.
    """
    tokens = set(
        _strip_accent(tok).lower()
        for tok in re.split(r"[\s,;.!?\"'()\[\]«»—–\-~/]+", text)
        if len(tok) > 1
    )
    if not tokens:
        return []

    seen_lexeme_ids: set[int] = set()
    results: list[SuggestedLink] = []

    # verb inflected forms
    for vf in db.execute(select(VerbForm)).scalars().all():
        if _strip_accent(vf.form).lower() not in tokens:
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
                                          lexeme_form=lex.form, matched_form=vf.form))

    # verb infinitives
    for v in db.execute(select(Verb)).scalars().all():
        if _strip_accent(v.infinitive).lower() not in tokens:
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
                                          lexeme_form=lex.form, matched_form=v.infinitive))

    # noun/entry inflected forms
    for ef in db.execute(select(EntryForm)).scalars().all():
        if _strip_accent(ef.form).lower() not in tokens:
            continue
        lex = db.execute(select(Lexeme).where(Lexeme.entry_id == ef.entry_id)).scalar_one_or_none()
        if lex and lex.id not in seen_lexeme_ids:
            seen_lexeme_ids.add(lex.id)
            results.append(SuggestedLink(lexeme_id=lex.id, lexeme_pos=lex.pos,
                                          lexeme_form=lex.form, matched_form=ef.form))

    # entry lemmas
    for e in db.execute(select(Entry)).scalars().all():
        for candidate in [e.lemma, _strip_accent(e.accented)]:
            if candidate.lower() not in tokens:
                continue
            lex = db.execute(select(Lexeme).where(Lexeme.entry_id == e.id)).scalar_one_or_none()
            if lex and lex.id not in seen_lexeme_ids:
                seen_lexeme_ids.add(lex.id)
                results.append(SuggestedLink(lexeme_id=lex.id, lexeme_pos=lex.pos,
                                              lexeme_form=lex.form, matched_form=e.lemma))
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
