from fastapi import FastAPI

import app.models  # noqa: F401 — ensures all models are registered with Base
from app.routers import verbs, aspect_pairs, derivations, verb_forms, tags, collocations, frequencies, translations, word_families, lexemes, nouns

app = FastAPI(redirect_slashes=False)

app.include_router(verbs.router)
app.include_router(aspect_pairs.router)
app.include_router(derivations.router)
app.include_router(verb_forms.router)
app.include_router(tags.router)
app.include_router(collocations.router)
app.include_router(frequencies.router)
app.include_router(translations.router)
app.include_router(word_families.router)
app.include_router(lexemes.router)
app.include_router(nouns.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
