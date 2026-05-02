# Ukrainian Learner's Dictionary

A personal web app for building and drilling a Ukrainian vocabulary. Started as a verb conjugation driller, now evolving into a full learner's dictionary covering all parts of speech.

**Stack:** FastAPI + SQLAlchemy (SQLite) · React + TypeScript + Vite

---

## What it does

### Dictionary
All entries share a **lexeme** (headword with accent mark, POS, optional tags, CEFR level, corpus frequency). Supported POS:

| POS | Features |
|---|---|
| Verb pairs | Aspect pair (ipf + pf), full conjugation paradigms, variants (e.g. stem-alternation forms) |
| Nouns | Gender, number type, full declension table |
| Adjectives, pronouns, numerals | Full declension table |
| Adverbs, conjunctions, prepositions, particles | Headword + translations |

Every entry can have:
- Translations (multiple languages)
- Tags (user-defined, filterable)
- Corpus frequency (ipm from Sketch Engine CSV import)
- CEFR level (imported from PULS wordlist)
- Word family membership

### Quick-add (goroh integration)
Paste a goroh.org URL → automatically imports the word with accented form, POS, full paradigm, and German translation.

### Text analysis
Paste Ukrainian text → each word is looked up in the dictionary; unknown words can be quick-added inline.

### Drills (verbs only)
- **Standard:** aspect switching, infinitive→form, singular↔plural, translation→form
- **Custom drills:** named templates with per-drill-type form slot selection (e.g. "past tense only", "1st person only"); managed on a separate page, selected from a dropdown on the drill page
- Verb scope: all verbs, manual selection, or by tag
- Type-in or flashcard mode; re-drill wrong answers

### Chunks
Ukrainian phrases/sentences with translations and optional verb/noun links. Drillable (Ukrainian→translate or target lang→give Ukrainian).

### Word families
Group lexemes into named families for thematic study.

---

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in values
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. API proxied by Vite to port 8000. Swagger docs at http://localhost:8000/docs.

---

## Environment variables (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | no | SQLAlchemy URL, defaults to `sqlite:///./local.db` |
| `SKETCHENGINE_API_KEY` | for frequency import | Sketch Engine API key |
| `SKETCHENGINE_CORPORA` | for frequency import | Comma-separated corpus IDs |
| `TRANSLATION_LANGUAGES` | no | Defaults to `en,de` |

---

## Project structure

```
backend/
├── app/
│   ├── main.py            # FastAPI entry point
│   ├── database.py        # Engine + FK enforcement (PRAGMA foreign_keys=ON)
│   ├── models/            # ORM: verbs, lexemes, nouns, chunks, word families,
│   │                      #       drill configs, …
│   ├── routers/           # One file per resource area
│   ├── schemas/           # Pydantic schemas
│   └── scripts/           # Frequency import, CEFR import
├── migrations/            # Alembic migrations
└── local.db               # SQLite DB (not committed)

frontend/src/
├── pages/                 # VerbListPage, PairPage, DrillPage, CustomDrillsPage,
│                          #   NounsListPage, WordsListPage, ChunksListPage, …
├── components/            # FormsTable, Nav
├── widgets/               # FilterPill, FormSlotPicker, TagChip, TagPicker
└── utils/                 # drillGenerators, drillSlots, forms, theme
```

## Helper scripts

See **[docs/scripts.md](docs/scripts.md)** for full documentation of the import and scraping scripts:

| Script | Purpose |
|---|---|
| `import_cefr.py` | Import CEFR levels from CSV |
| `import_lemma_frequencies.py` | Import Sketch Engine frequency data |
| `import_ref_pairs.py` | Import reference aspect pairs from textbook CSV |
| `scrape_peremova_cefr.py` | Scrape CEFR data from puls.peremova.org |

All scripts run from `backend/` with the virtualenv active.

---

## Notes

- SQLite FK enforcement is on (`PRAGMA foreign_keys=ON` per connection); cascades are wired on all FK columns.
- Frequency data is imported from Sketch Engine CSV exports (not fetched live).
- CEFR levels are from the PULS wordlist (file not committed — place in `backend/local/cefr.csv`).
