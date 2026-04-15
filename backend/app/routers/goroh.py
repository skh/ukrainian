"""Fetch and parse paradigm pages from goroh.pp.ua."""
import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entry import Lexeme
from app.models.verb import Verb
from app.utils import strip_accent

router = APIRouter(tags=["goroh"])

_GOROH_URL = "https://goroh.pp.ua/Словозміна/{word}"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

_POS_MAP = {
    "іменник": "noun",
    "прикметник": "adjective",
    "займенник": "pronoun",
    "числівник": "numeral",
    "дієслово": "verb",
    "прислівник": "adverb",
    "прийменник": "preposition",
    "сполучник": "conjunction",
}

_GENDER_MAP = {
    "чоловічий рід": "m",
    "жіночий рід": "f",
    "середній рід": "n",
}

_ASPECT_MAP = {
    "недоконаний вид": "ipf",
    "доконаний вид": "pf",
}

_CASE_MAP = {
    "називний": "nom",
    "родовий": "gen",
    "давальний": "dat",
    "знахідний": "acc",
    "орудний": "ins",
    "місцевий": "loc",
    "кличний": "voc",
}

_TENSE_MAP = {
    "Теперішній час": "present",
    "Майбутній час": "future",
    "Минулий час": "past",
    "Наказовий спосіб": "imperative",
}

_PERSON_MAP = {
    "1 особа": "1",
    "2 особа": "2",
    "3 особа": "3",
}

_PAST_GENDER_MAP = {
    "чол. р.": "masculine",
    "жін. р.": "feminine",
    "сер. р.": "neuter",
}

_SKIP_TITLES = {"Коротка форма", "Просторічна форма", "Архаїзм"}


class GorohForm(BaseModel):
    tags: str
    form: str


class GorohCandidate(BaseModel):
    goroh_id: str
    accented: str
    gloss: str | None
    pos: str
    gender: str | None
    number_type: str | None
    aspect: str | None
    forms: list[GorohForm]
    already_exists: bool
    existing_id: int | None


def _cell_forms(cell) -> list[str]:
    result = []
    for span in cell.find_all("span", class_="word"):
        if "alternative-spelling" in span.get("class", []):
            continue
        if span.get("title", "") in _SKIP_TITLES:
            continue
        text = span.get_text(strip=True)
        if text and text not in ("—", "-"):
            result.append(text)
    # Goroh lists -сь before -ся but -ся is the standard form.
    # If both variants are present, drop the -сь ones.
    if any(strip_accent(f).endswith("ся") for f in result):
        result = [f for f in result if not strip_accent(f).endswith("сь")]
    return result


def _parse_declinable_table(table, pos: str) -> tuple[list[GorohForm], str | None]:
    forms: list[GorohForm] = []
    sg_missing = 0
    pl_missing = 0

    header_row = table.find("tr", class_=lambda c: c and "column-header" in c)
    if not header_row:
        return forms, None
    header_cells = header_row.find_all("td", class_="cell")
    col_count = len(header_cells) - 1  # subtract the "відмінок" cell

    for row in table.find_all("tr", class_="row"):
        row_classes = row.get("class", [])
        if "column-header" in row_classes or "subgroup-header" in row_classes:
            continue

        header_cell = row.find("td", class_="header")
        if not header_cell:
            continue
        case_key = _CASE_MAP.get(header_cell.get_text(strip=True))
        if not case_key:
            continue

        form_cells = [c for c in row.find_all("td", class_="cell") if "header" not in c.get("class", [])]

        if col_count >= 4:
            for tag_suffix, idx in [("sg,m", 0), ("sg,f", 1), ("sg,n", 2), ("pl", 3)]:
                if idx < len(form_cells):
                    for f in _cell_forms(form_cells[idx]):
                        forms.append(GorohForm(tags=f"{case_key},{tag_suffix}", form=f))
        elif col_count == 2:
            sg_forms = _cell_forms(form_cells[0]) if len(form_cells) > 0 else []
            pl_forms = _cell_forms(form_cells[1]) if len(form_cells) > 1 else []
            if sg_forms:
                for f in sg_forms:
                    forms.append(GorohForm(tags=f"{case_key},sg", form=f))
            else:
                sg_missing += 1
            if pl_forms:
                for f in pl_forms:
                    forms.append(GorohForm(tags=f"{case_key},pl", form=f))
            else:
                pl_missing += 1
        else:
            sg_forms = _cell_forms(form_cells[0]) if form_cells else []
            if sg_forms:
                for f in sg_forms:
                    forms.append(GorohForm(tags=f"{case_key},sg", form=f))
            else:
                sg_missing += 1

    number_type = None
    if pos == "noun":
        if pl_missing >= 6 and sg_missing == 0:
            number_type = "sg"
        elif sg_missing >= 6 and pl_missing == 0:
            number_type = "pl"
        else:
            number_type = "both"

    return forms, number_type


def _parse_verb_table(table) -> list[GorohForm]:
    forms: list[GorohForm] = []
    current_tense: str | None = None
    past_plural_added = False
    past_genders_seen: set[str] = set()

    for row in table.find_all("tr", class_="row"):
        row_classes = row.get("class", [])

        if "subgroup-header" in row_classes:
            cell = row.find("td")
            if cell:
                current_tense = _TENSE_MAP.get(cell.get_text(strip=True))
                if current_tense == "past":
                    past_plural_added = False
                    past_genders_seen = set()
            continue

        if "column-header" in row_classes or not current_tense:
            continue

        header_cell = row.find("td", class_="header")
        if not header_cell:
            continue
        row_label = header_cell.get_text(strip=True)

        form_cells = [c for c in row.find_all("td", class_="cell") if "header" not in c.get("class", [])]

        if current_tense == "past":
            gender = _PAST_GENDER_MAP.get(row_label)
            # Skip unknown labels and duplicate gender rows (latter are past-active-participle
            # forms that goroh lists after the standard past tense with the same row labels).
            if not gender or gender in past_genders_seen:
                continue
            past_genders_seen.add(gender)
            for cell in form_cells:
                cell_classes = cell.get("class", [])
                if "light-cell" in cell_classes:
                    if not past_plural_added:
                        for f in _cell_forms(cell):
                            forms.append(GorohForm(tags="past,plural", form=f))
                        past_plural_added = True
                else:
                    for f in _cell_forms(cell):
                        forms.append(GorohForm(tags=f"past,{gender},singular", form=f))
        else:
            person = _PERSON_MAP.get(row_label)
            if not person:
                continue
            for j, number in enumerate(["singular", "plural"]):
                if j < len(form_cells):
                    for f in _cell_forms(form_cells[j]):
                        forms.append(GorohForm(tags=f"{current_tense},{person},{number}", form=f))

    return forms



def _parse_article(block, db: Session) -> GorohCandidate | None:
    goroh_id = block.get("id", "")

    h2 = block.find("h2", class_="page__sub-header")
    if not h2:
        return None

    gloss_span = h2.find("span", class_="short-interpret")
    gloss = gloss_span.get_text(strip=True) if gloss_span else None
    if gloss_span:
        gloss_span.extract()
    accented = h2.get_text(strip=True)
    if not accented:
        return None

    taglist = block.find("div", class_="taglist")
    tag_texts = [a.get_text(strip=True) for a in taglist.find_all("a")] if taglist else []

    if "дієприкметник" in tag_texts:
        pos = "adjective"
    else:
        pos = next((_POS_MAP[t] for t in tag_texts if t in _POS_MAP), None)
    if not pos:
        return None

    gender = next((_GENDER_MAP[t] for t in tag_texts if t in _GENDER_MAP), None)
    aspect = next((_ASPECT_MAP[t] for t in tag_texts if t in _ASPECT_MAP), None)

    forms: list[GorohForm] = []
    number_type: str | None = None

    table = block.find("table", class_="table")
    if table:
        if pos == "verb":
            forms = _parse_verb_table(table)
        else:
            forms, number_type = _parse_declinable_table(table, pos)

    # Duplicate check
    lemma = strip_accent(accented)
    already_exists = False
    existing_id: int | None = None

    if pos == "verb":
        row = db.execute(
            select(Verb).where(func.replace(Verb.accented, "\u0301", "") == lemma)
        ).scalar_one_or_none()
        if row:
            already_exists = True
            existing_id = row.id
    else:
        row = db.execute(
            select(Lexeme).where(func.replace(Lexeme.accented, "\u0301", "") == lemma)
        ).scalar_one_or_none()
        if row:
            already_exists = True
            existing_id = row.id

    return GorohCandidate(
        goroh_id=goroh_id,
        accented=accented,
        gloss=gloss,
        pos=pos,
        gender=gender,
        number_type=number_type,
        aspect=aspect,
        forms=forms,
        already_exists=already_exists,
        existing_id=existing_id,
    )


@router.get("/api/goroh-fetch", response_model=list[GorohCandidate])
async def goroh_fetch(word: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    url = _GOROH_URL.format(word=word)
    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        try:
            resp = await client.get(url, headers=_HEADERS)
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Could not reach goroh: {e}")

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Goroh returned {resp.status_code}")

    soup = BeautifulSoup(resp.text, "html.parser")
    blocks = soup.find_all("div", class_="article-block")

    candidates = []
    for block in blocks:
        candidate = _parse_article(block, db)
        if candidate is not None:
            candidates.append(candidate)

    return candidates
