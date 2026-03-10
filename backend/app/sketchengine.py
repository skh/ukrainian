import os
import httpx

BASE_URL = "https://api.sketchengine.eu/bonito/run.cgi"


def _api_key() -> str:
    key = os.getenv("SKETCHENGINE_API_KEY", "")
    if not key:
        raise RuntimeError("SKETCHENGINE_API_KEY is not set")
    return key


def fetch_ipm(corpus: str, lemma: str) -> float:
    """Return instances-per-million for *lemma* in *corpus*.

    Uses the wsketch endpoint (precomputed, fast even on large corpora).
    Returns 0.0 if the lemma is not found in the corpus.
    """
    api_key = _api_key()

    with httpx.Client(timeout=60) as client:
        ws = client.get(
            f"{BASE_URL}/wsketch",
            params={"corpname": corpus, "lemma": lemma, "format": "json", "api_key": api_key},
        )
        ws.raise_for_status()
        ws_data = ws.json()

        if "error" in ws_data:
            # Lemma not found in this corpus — treat as zero frequency.
            return 0.0

        # relfreq is already ipm (occurrences per million tokens).
        return float(ws_data["relfreq"])


def configured_corpora() -> list[str]:
    raw = os.getenv("SKETCHENGINE_CORPORA", "")
    return [c.strip() for c in raw.split(",") if c.strip()]
