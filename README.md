# Ukrainian Verb Drills

A web app for drilling Ukrainian verb conjugation. The core unit is an **aspect pair** (imperfective + perfective), though solo verbs (a single verb with no aspect partner) are also supported.

Features:
- Add verbs with full conjugation paradigms (present/future, past, imperative)
- Group verbs into aspect pairs; tag pairs for filtering
- Collocations and translations (multiple languages) per pair
- Frequency data from Sketch Engine (ipm, per corpus, on demand)
- Drill modes: aspect switching, infinitive→form, singular↔plural; type-in or flashcard
- Re-drill wrong answers from the summary screen

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill in your values
alembic upgrade head
```

### Frontend

```bash
cd frontend
npm install
```

## Running in development

Open two terminals:

**Terminal 1 — backend** (http://localhost:8000):

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — frontend** (http://localhost:5173):

```bash
cd frontend
npm run dev
```

Open http://localhost:5173. API requests are proxied by Vite to the backend — no CORS setup needed. Auto-generated API docs: http://localhost:8000/docs.

## Environment variables (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | no | SQLAlchemy URL, defaults to `sqlite:///./local.db` |
| `SKETCHENGINE_API_KEY` | for frequency fetch | Your Sketch Engine API key |
| `SKETCHENGINE_CORPORA` | for frequency fetch | Comma-separated corpus IDs (e.g. `preloaded/uktenten22_rft2`) |
| `TRANSLATION_LANGUAGES` | no | Languages for translations, defaults to `en,de` |

## Project structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── database.py       # SQLAlchemy engine, session, Base
│   │   ├── crud.py           # Shared helpers (get_or_404)
│   │   ├── sketchengine.py   # Sketch Engine API client
│   │   ├── models/           # ORM models
│   │   ├── routers/          # API route handlers
│   │   └── schemas/          # Pydantic request/response schemas
│   ├── migrations/           # Alembic migrations
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/client.ts     # Typed fetch wrapper
    │   ├── types.ts          # Shared TypeScript interfaces
    │   ├── utils/            # Form helpers, drill generators, theme
    │   ├── widgets/          # TagChip, TagPicker
    │   ├── components/       # FormsTable
    │   └── pages/            # VerbListPage, PairPage, DrillPage, …
    ├── vite.config.ts
    └── package.json
```

## Switching to PostgreSQL

Set `DATABASE_URL` in `backend/.env`:

```
DATABASE_URL=postgresql://user:password@localhost/dbname
```

No other changes needed.
