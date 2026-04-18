import locale
import re
from typing import Optional

try:
    locale.setlocale(locale.LC_COLLATE, 'uk_UA.UTF-8')
except locale.Error:
    pass  # fall back to default collation

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entry import Lexeme, LexemeForm, LexemeTranslation
from app.models.verb import Verb, AspectPair
from app.utils import normalize

router = APIRouter(tags=["analyze"])

# Matches a Ukrainian word, including an internal apostrophe (U+0027, U+2019, U+02BC)
# surrounded by letters on both sides.
_LETTERS = r'[а-яіїєґА-ЯІЇЄҐ\u0301]'
_WORD_RE = re.compile(rf"{_LETTERS}+(?:['\u2019\u02BC]{_LETTERS}+)*")


class AnalyzeRequest(BaseModel):
    text: str


class TranslationInfo(BaseModel):
    lang: str
    text: str


class FormInfo(BaseModel):
    tags: str
    form: str


class VerbInfo(BaseModel):
    accented: str
    aspect: str
    forms: list[FormInfo]


class TokenMatch(BaseModel):
    lexeme_id: int
    accented: str
    pos: str
    gender: Optional[str] = None
    translations: list[TranslationInfo]
    forms: list[FormInfo]
    verbs: list[VerbInfo]


class AnalyzedToken(BaseModel):
    text: str
    is_word: bool
    match: Optional[TokenMatch] = None


class AnalyzeResponse(BaseModel):
    tokens: list[AnalyzedToken]
    unknown: list[str]


def _build_lookup(db: Session) -> dict[str, Lexeme]:
    lookup: dict[str, Lexeme] = {}

    # Noun/word inflected forms
    for lf in db.execute(select(LexemeForm).where(LexemeForm.lexeme_id.isnot(None))).scalars().all():
        key = normalize(lf.form)
        if key not in lookup:
            lex = db.get(Lexeme, lf.lexeme_id)
            if lex:
                lookup[key] = lex

    # Verb inflected forms → pair lexeme
    verb_to_pair: dict[int, Lexeme] = {}
    for pair in db.execute(select(AspectPair)).scalars().all():
        lex = db.execute(select(Lexeme).where(Lexeme.pair_id == pair.id)).scalar_one_or_none()
        if lex:
            if pair.ipf_verb_id:
                verb_to_pair[pair.ipf_verb_id] = lex
            if pair.pf_verb_id:
                verb_to_pair[pair.pf_verb_id] = lex

    # Variant verbs share their canonical verb's pair lexeme
    for v in db.execute(select(Verb).where(Verb.variant_of.isnot(None))).scalars().all():
        if v.variant_of in verb_to_pair:
            verb_to_pair[v.id] = verb_to_pair[v.variant_of]

    for lf in db.execute(select(LexemeForm).where(LexemeForm.verb_id.isnot(None))).scalars().all():
        key = normalize(lf.form)
        if key not in lookup and lf.verb_id in verb_to_pair:
            lookup[key] = verb_to_pair[lf.verb_id]

    # Verb infinitives
    for v in db.execute(select(Verb)).scalars().all():
        key = normalize(v.infinitive)
        if key not in lookup and v.id in verb_to_pair:
            lookup[key] = verb_to_pair[v.id]

    # Lexeme lemmas / accented forms (non-pair)
    for lex in db.execute(select(Lexeme).where(Lexeme.pos != 'pair')).scalars().all():
        for candidate in [normalize(lex.lemma), normalize(lex.accented)]:
            if candidate and candidate not in lookup:
                lookup[candidate] = lex

    return lookup


def _build_match(lex: Lexeme, db: Session) -> TokenMatch:
    translations = [
        TranslationInfo(lang=t.lang, text=t.text)
        for t in db.execute(
            select(LexemeTranslation).where(LexemeTranslation.lexeme_id == lex.id)
            .order_by(LexemeTranslation.lang, LexemeTranslation.id)
        ).scalars().all()
    ]

    if lex.pos == 'pair' and lex.pair_id is not None:
        pair = db.execute(select(AspectPair).where(AspectPair.id == lex.pair_id)).scalar_one_or_none()
        verbs: list[VerbInfo] = []
        if pair:
            for verb_id in [pair.ipf_verb_id, pair.pf_verb_id]:
                if verb_id is None:
                    continue
                v = db.get(Verb, verb_id)
                if not v:
                    continue
                vforms = [
                    FormInfo(tags=lf.tags, form=lf.form)
                    for lf in db.execute(
                        select(LexemeForm).where(LexemeForm.verb_id == verb_id)
                        .order_by(LexemeForm.tags)
                    ).scalars().all()
                ]
                verbs.append(VerbInfo(accented=v.accented, aspect=v.aspect, forms=vforms))
        return TokenMatch(
            lexeme_id=lex.id, accented=lex.accented, pos=lex.pos,
            gender=lex.gender, translations=translations, forms=[], verbs=verbs,
        )

    forms = [
        FormInfo(tags=lf.tags, form=lf.form)
        for lf in db.execute(
            select(LexemeForm).where(LexemeForm.lexeme_id == lex.id)
            .order_by(LexemeForm.tags)
        ).scalars().all()
    ]
    return TokenMatch(
        lexeme_id=lex.id, accented=lex.accented, pos=lex.pos,
        gender=lex.gender, translations=translations, forms=forms, verbs=[],
    )


@router.post("/api/analyze-text", response_model=AnalyzeResponse)
def analyze_text(body: AnalyzeRequest, db: Session = Depends(get_db)):
    lookup = _build_lookup(db)

    tokens: list[AnalyzedToken] = []
    unknown_set: set[str] = set()
    match_cache: dict[int, TokenMatch] = {}
    last = 0

    for m in _WORD_RE.finditer(body.text):
        if m.start() > last:
            tokens.append(AnalyzedToken(text=body.text[last:m.start()], is_word=False))

        word = m.group()
        key = normalize(word)
        lex = lookup.get(key)

        if lex:
            if lex.id not in match_cache:
                match_cache[lex.id] = _build_match(lex, db)
            tokens.append(AnalyzedToken(text=word, is_word=True, match=match_cache[lex.id]))
        else:
            tokens.append(AnalyzedToken(text=word, is_word=True))
            unknown_set.add(key)

        last = m.end()

    if last < len(body.text):
        tokens.append(AnalyzedToken(text=body.text[last:], is_word=False))

    return AnalyzeResponse(tokens=tokens, unknown=sorted(unknown_set, key=locale.strxfrm))
