"""Fetch and parse UK→DE translation candidates from verbformen.com."""
import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(tags=["verbformen"])

_VF_URL = "https://www.verbformen.com/uk-de/?w={word}"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

_ARTICLE_MAP = {
    "gender feminine": "die",
    "gender masculine": "der",
    "gender neuter": "das",
}

_POS_TITLES = {
    "noun", "verb", "adjective", "adverb",
    "preposition", "conjunction", "pronoun", "numeral",
}


class VerbformenCandidate(BaseModel):
    german: str
    article: str | None
    cefr: str | None
    pos: str | None
    uk_gloss: str | None
    definition: str | None


def _parse_entry(block) -> VerbformenCandidate | None:
    # German word — first q.wF in block
    q = block.find("q", class_="wF")
    if not q:
        return None
    german = q.get_text(strip=True)
    if not german:
        return None

    # Article (noun gender)
    article = None
    for span in block.find_all("span"):
        title = span.get("title", "")
        if title in _ARTICLE_MAP:
            article = _ARTICLE_MAP[title]
            break

    # CEFR level
    cefr_span = block.find("span", class_="bZrt")
    cefr = cefr_span.get_text(strip=True) if cefr_span else None

    # POS — look in p.rKln spans
    pos = None
    meta_p = block.find("p", class_="rKln")
    if meta_p:
        for span in meta_p.find_all("span"):
            t = span.get("title", "").lower()
            if t in _POS_TITLES:
                pos = t
                break

    # Ukrainian gloss — <mark> inside span[lang="uk"]
    uk_gloss = None
    uk_span = block.find("span", lang="uk")
    if uk_span:
        mark = uk_span.find("mark")
        if mark:
            uk_gloss = mark.get_text(strip=True)

    # German definition — <i> inside p.rNt that has rInf but not wKnFmt
    definition = None
    for p in block.find_all("p", class_="rNt"):
        classes = p.get("class", [])
        if "rInf" in classes and "wKnFmt" not in classes:
            i_tag = p.find("i")
            if i_tag:
                definition = i_tag.get_text(strip=True)
                break

    return VerbformenCandidate(
        german=german,
        article=article,
        cefr=cefr,
        pos=pos,
        uk_gloss=uk_gloss,
        definition=definition,
    )


@router.get("/api/verbformen-fetch", response_model=list[VerbformenCandidate])
async def verbformen_fetch(word: str = Query(..., min_length=1)):
    url = _VF_URL.format(word=word)
    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        try:
            resp = await client.get(url, headers=_HEADERS)
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Could not reach verbformen: {e}")

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"verbformen returned {resp.status_code}")

    soup = BeautifulSoup(resp.text, "html.parser")
    results = []
    for block in soup.find_all("div", class_="bTrf"):
        candidate = _parse_entry(block)
        if candidate:
            results.append(candidate)
    return results
