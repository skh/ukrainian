"""Import Sketch Engine word-list CSV exports into corpus_lemma_frequencies.

Usage:
    # Import all CSVs in a directory:
    python scripts/import_lemma_frequencies.py local/data/

    # Import specific files:
    python scripts/import_lemma_frequencies.py local/data/wordlist_*.csv

Reruns are safe: existing (corpus, lemma) pairs are skipped (INSERT OR IGNORE).

CSV format (Sketch Engine word-list export):
    Line 1: "academic use only"
    Line 2: "corpus","preloaded/uktenten22_rft2"
    Line 3: "subcorpus","-"
    Line 4: (blank)
    Line 5: Item,Frequency,Relative frequency
    Line 6+: lemma,absolute_freq,ipm
"""
import csv
import glob
import os
import sys

import sqlalchemy as sa

_ORIGINAL_CWD = os.getcwd()
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# Change to backend dir so sqlite:///./local.db resolves correctly
os.chdir(BACKEND_DIR)

from app.database import engine  # noqa: E402 — after sys.path + chdir


def _parse_corpus(path: str) -> str | None:
    """Read corpus name from the CSV header (line 3, after BOM + blank line)."""
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        for row in reader:
            if row and row[0].strip().lower() == "corpus" and len(row) >= 2:
                return row[1].strip()
            # Stop looking once we hit the data header
            if row and row[0].strip() == "Item":
                break
    return None


def _import_file(conn: sa.Connection, path: str) -> tuple[int, int]:
    """Return (inserted, skipped) counts for one file."""
    corpus = _parse_corpus(path)
    if not corpus:
        print(f"  WARNING: could not detect corpus name in {path}, skipping")
        return 0, 0

    rows = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        # Skip until (and including) the "Item,Frequency,..." header line
        for row in reader:
            if row and row[0].strip() == "Item":
                break  # next rows are data
        for row in reader:
            if len(row) < 3:
                continue
            lemma, freq_str, ipm_str = row[0].strip().lower(), row[1].strip(), row[2].strip()
            if not lemma:
                continue
            try:
                rows.append({"corpus": corpus, "lemma": lemma, "freq": int(freq_str), "ipm": float(ipm_str)})
            except ValueError:
                continue

    if not rows:
        return 0, 0

    result = conn.execute(
        sa.text(
            "INSERT OR IGNORE INTO corpus_lemma_frequencies (corpus, lemma, freq, ipm) "
            "VALUES (:corpus, :lemma, :freq, :ipm)"
        ),
        rows,
    )
    inserted = result.rowcount
    skipped = len(rows) - inserted
    return inserted, skipped


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_lemma_frequencies.py <dir_or_file> [...]")
        sys.exit(1)

    paths: list[str] = []
    for arg in sys.argv[1:]:
        arg = os.path.join(_ORIGINAL_CWD, arg) if not os.path.isabs(arg) else arg
        if os.path.isdir(arg):
            paths.extend(sorted(glob.glob(os.path.join(arg, "*.csv"))))
        else:
            paths.extend(sorted(glob.glob(arg)))

    if not paths:
        print("No CSV files found.")
        sys.exit(1)

    total_inserted = total_skipped = 0

    with engine.begin() as conn:
        for path in paths:
            print(f"  {os.path.basename(path)} … ", end="", flush=True)
            inserted, skipped = _import_file(conn, path)
            print(f"{inserted} inserted, {skipped} skipped")
            total_inserted += inserted
            total_skipped += skipped

    print(f"\nTotal: {total_inserted} inserted, {total_skipped} skipped across {len(paths)} file(s)")


if __name__ == "__main__":
    main()
