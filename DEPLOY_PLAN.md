# Plan: Read-Only Deployable Image

## Context
The app currently runs locally with a mutable SQLite database. The goal is to produce a self-contained Docker image that bakes in a snapshot of the database and exposes a read-only version of the app — no add/edit/delete functionality — suitable for public deployment.

---

## Approach

### 1. Frontend — build-time `VITE_READONLY` flag

Create `frontend/src/readonlyContext.ts`:
```ts
export const READONLY = import.meta.env.VITE_READONLY === 'true'
```

The Dockerfile passes `--build-arg VITE_READONLY=true` to `npm run build`, so the flag is baked into the JS bundle. No runtime API call needed.

**Per-file changes** (import `READONLY` and wrap/suppress edit UI):

| File | What to suppress |
|---|---|
| `frontend/src/App.tsx` | Skip routes `/verbs/add` and `/verbs/:id/edit` |
| `frontend/src/pages/VerbListPage.tsx` | "Add verb" link; `TagPicker`; remove buttons on `TagChip`; "Mark as solo" button; unpaired verbs edit links |
| `frontend/src/pages/PairPage.tsx` | "edit ipf/pf" links; TranslationRow add/edit/delete buttons; collocation add-form + edit/delete buttons; frequency Fetch/Refetch buttons; "New family with this pair" button |
| `frontend/src/pages/WordFamiliesPage.tsx` | "New family" button |
| `frontend/src/pages/WordFamilyPage.tsx` | `MemberChip` × remove buttons; "Add verb pair" section; "Add word" section; "Delete family" section |
| `frontend/src/widgets/TagChip.tsx` | Add optional `hideRemove?: boolean` prop (or read `READONLY` directly) |

Pattern throughout: `{!READONLY && <EditThing />}` — straightforward conditional rendering.

### 2. Backend — readonly middleware in `main.py`

Add before `include_router` calls:
```python
READONLY = os.getenv("READONLY", "false").lower() == "true"

@app.middleware("http")
async def readonly_guard(request: Request, call_next):
    if READONLY and request.method not in ("GET", "HEAD", "OPTIONS"):
        return JSONResponse(status_code=405, content={"detail": "Read-only instance."})
    return await call_next(request)
```

This covers all current and future write routes in one place.

### 3. Backend — serve frontend static files

Add to the bottom of `main.py` (after all routers):
```python
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="static", html=True), name="static")
```

`html=True` makes React Router deep-links (e.g. `/pairs/42`) work by returning `index.html` for unmatched paths.

### 4. Dockerfile (repo root, multi-stage)

```dockerfile
# Stage 1: build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_READONLY=true
ENV VITE_READONLY=$VITE_READONLY
RUN npm run build

# Stage 2: runtime
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist/ ./static/
# Bake the database snapshot
COPY backend/local.db ./app.db
ENV READONLY=true
ENV DATABASE_URL=sqlite:////app/app.db
# Railway injects $PORT at runtime; default to 8000 for local builds
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

### 5. Deployment on Railway

`local.db` is never committed to git. The image is built locally and pushed to a registry; Railway pulls it from there.

**One-time setup:**
1. Create a free account on [hub.docker.com](https://hub.docker.com) (or use GitHub Container Registry)
2. On railway.com: **New Project → Deploy from Docker image**
3. Enter the image name (e.g. `skh/ukrainian:latest`)
4. Railway assigns a public URL (e.g. `ukrainian-production.up.railway.app`)

**Each time you want to publish a new snapshot:**
```bash
# from repo root
docker build -t skh/ukrainian:latest .
docker push skh/ukrainian:latest
```
Then in Railway: **Deploy → Redeploy** (or enable auto-redeploy on image push via a Railway webhook).

**API keys must never go in the image.** The only env vars baked in are `READONLY=true` and `DATABASE_URL`. `SKETCHENGINE_API_KEY` must not be set in the Dockerfile — in readonly mode the Fetch/Refetch buttons are hidden and no Sketch Engine calls are made, so the key is not needed. If a key were ever required at runtime, inject it via Railway's environment variable settings (not hardcoded in the Dockerfile), and it will be kept out of the image layer history.

---

## .gitignore

Ensure `backend/local.db` is in `.gitignore` (it must never be committed).

## Files to create/modify

- **new** `Dockerfile` (repo root)
- **new** `frontend/src/readonlyContext.ts`
- `backend/app/main.py` — add middleware + StaticFiles mount
- `frontend/src/App.tsx` — skip edit routes
- `frontend/src/pages/VerbListPage.tsx`
- `frontend/src/pages/PairPage.tsx`
- `frontend/src/pages/WordFamiliesPage.tsx`
- `frontend/src/pages/WordFamilyPage.tsx`
- `frontend/src/widgets/TagChip.tsx`

---

## Verification

1. `docker build -t ukrainian:latest .` — should complete without error (local smoke test)
2. `docker run -e PORT=8000 -p 8000:8000 ukrainian:latest` — visit `http://localhost:8000`, verb list loads
3. Deep link test: navigate directly to `/pairs/1` — should load, not 404
4. Edit UI absent: no "Add verb", no tag ×, no translation edit buttons visible
5. Write block test: `curl -X POST http://localhost:8000/api/tags -d '{}'` → 405
6. Drill still works: `/drill` route functions normally
