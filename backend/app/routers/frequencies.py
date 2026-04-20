from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.verb import AspectPair, Verb
from app.models.entry import CefrEntry, CorpusLemmaFrequency, Lexeme
from app.schemas.frequency import VerbFrequencyOut, LexemeFrequencyOut

router = APIRouter(tags=["frequencies"])


@router.get("/api/cefr", response_model=dict[str, str])
def get_cefr(db: Session = Depends(get_db)):
    rows = db.execute(select(CefrEntry)).scalars().all()
    return {r.lemma: r.level for r in rows}


@router.get("/api/frequencies", response_model=list[VerbFrequencyOut])
def get_all_frequencies(db: Session = Depends(get_db)):
    verbs = db.execute(select(Verb)).scalars().all()
    by_infinitive: dict[str, list[int]] = {}
    for v in verbs:
        by_infinitive.setdefault(v.infinitive.lower(), []).append(v.id)

    clf_rows = db.execute(
        select(CorpusLemmaFrequency)
        .where(CorpusLemmaFrequency.lemma.in_(by_infinitive))
    ).scalars().all()

    out = []
    verb_variant_of = {v.id: v.variant_of for v in verbs}
    for clf in clf_rows:
        for verb_id in by_infinitive[clf.lemma]:
            out.append({"verb_id": verb_id, "corpus": clf.corpus, "freq": clf.freq, "ipm": clf.ipm, "variant_of": verb_variant_of[verb_id]})
    return out


@router.get("/api/pairs/{pair_id}/frequencies", response_model=list[VerbFrequencyOut])
def get_pair_frequencies(pair_id: int, db: Session = Depends(get_db)):
    pair = get_or_404(db, AspectPair, pair_id)
    verb_ids = [vid for vid in [pair.ipf_verb_id, pair.pf_verb_id] if vid is not None]
    verbs = db.execute(select(Verb).where(Verb.id.in_(verb_ids))).scalars().all()
    variant_verbs = db.execute(select(Verb).where(Verb.variant_of.in_(verb_ids))).scalars().all()
    all_verbs = list(verbs) + list(variant_verbs)

    by_infinitive: dict[str, list[tuple[int, int | None]]] = {}
    for v in all_verbs:
        by_infinitive.setdefault(v.infinitive.lower(), []).append((v.id, v.variant_of))

    clf_rows = db.execute(
        select(CorpusLemmaFrequency)
        .where(CorpusLemmaFrequency.lemma.in_(by_infinitive))
        .order_by(CorpusLemmaFrequency.corpus)
    ).scalars().all()

    out = []
    for clf in clf_rows:
        for verb_id, variant_of in sorted(by_infinitive[clf.lemma]):
            out.append({"verb_id": verb_id, "corpus": clf.corpus, "freq": clf.freq, "ipm": clf.ipm, "variant_of": variant_of})
    return out


@router.get("/api/lexeme-frequencies", response_model=list[LexemeFrequencyOut])
def get_all_lexeme_frequencies(db: Session = Depends(get_db)):
    lexemes = db.execute(select(Lexeme)).scalars().all()
    by_lemma: dict[str, list[int]] = {}
    for lex in lexemes:
        by_lemma.setdefault(lex.lemma.lower(), []).append(lex.id)

    clf_rows = db.execute(
        select(CorpusLemmaFrequency)
        .where(CorpusLemmaFrequency.lemma.in_(by_lemma))
    ).scalars().all()

    out = []
    for clf in clf_rows:
        for lex_id in by_lemma[clf.lemma]:
            out.append({"lexeme_id": lex_id, "corpus": clf.corpus, "freq": clf.freq, "ipm": clf.ipm})
    return out


@router.get("/api/lexemes/{lexeme_id}/frequencies", response_model=list[LexemeFrequencyOut])
def get_lexeme_frequencies(lexeme_id: int, db: Session = Depends(get_db)):
    lex = get_or_404(db, Lexeme, lexeme_id)
    rows = db.execute(
        select(CorpusLemmaFrequency)
        .where(CorpusLemmaFrequency.lemma == lex.lemma.lower())
        .order_by(CorpusLemmaFrequency.corpus)
    ).scalars().all()
    return [{"lexeme_id": lexeme_id, "corpus": r.corpus, "freq": r.freq, "ipm": r.ipm} for r in rows]
