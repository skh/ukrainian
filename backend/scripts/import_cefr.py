"""Import CEFR levels from a puls.peremova.org CSV into cefr_entries.

Usage:
    python scripts/import_cefr.py cefr.csv

CSV format: lemma,cefr  (header row, then data)

When a lemma appears multiple times at different levels, the lowest (most
basic) level wins: A1 < A2 < B1 < B2 < C1 < C2.

Reruns are safe: existing lemmata are overwritten only if the new level is lower.
"""
import csv
import os
import sys

import sqlalchemy as sa

_ORIGINAL_CWD = os.getcwd()
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))
os.chdir(BACKEND_DIR)

from app.database import engine  # noqa: E402

LEVEL_ORDER = {"A1": 0, "A2": 1, "B1": 2, "B2": 3, "C1": 4, "C2": 5}
VALID_LEVELS = set(LEVEL_ORDER)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_cefr.py <cefr.csv>")
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.isabs(path):
        path = os.path.join(_ORIGINAL_CWD, path)

    # Build map: lowercase lemma → lowest level seen
    best: dict[str, str] = {}
    skipped = 0
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lemma = row.get("lemma", "").strip().lower()
            level = row.get("cefr", "").strip().upper()
            if not lemma or level not in VALID_LEVELS:
                skipped += 1
                continue
            if lemma not in best or LEVEL_ORDER[level] < LEVEL_ORDER[best[lemma]]:
                best[lemma] = level

    if not best:
        print("No valid entries found.")
        sys.exit(1)

    rows = [{"lemma": lemma, "level": level} for lemma, level in best.items()]

    with engine.begin() as conn:
        conn.execute(sa.text("DELETE FROM cefr_entries"))
        conn.execute(
            sa.text("INSERT INTO cefr_entries (lemma, level) VALUES (:lemma, :level)"),
            rows,
        )

    print(f"Imported {len(rows)} lemmata ({skipped} rows skipped). Replaced all previous data.")


if __name__ == "__main__":
    main()
