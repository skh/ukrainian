# Helper scripts

All scripts live in `backend/scripts/` and must be run from the `backend/` directory with the virtualenv active:

```bash
cd backend
source .venv/bin/activate
python scripts/<script>.py ...
```

---

## `import_cefr.py` — Import CEFR levels

Imports lemma → CEFR level mappings into the `cefr_entries` table from a CSV file.

```bash
python scripts/import_cefr.py <cefr.csv>
```

**CSV format** — header row required:
```
lemma,cefr
читати,A1
писати,A2
```

Valid CEFR values: `A1 A2 B1 B2 C1 C2`

**Behaviour:**
- When a lemma appears multiple times at different levels, the lowest (most basic) wins: A1 < A2 < B1 < B2 < C1 < C2.
- Safe to rerun: existing lemmata are overwritten only if the new level is lower.

**Source data:** scraped from [puls.peremova.org](https://puls.peremova.org) using `scrape_peremova_cefr.py`, or provided as `local/cefr2.csv` (not committed).

> **Note:** The PULS wordlist is © Peremova / respective rights holders. The scraped data is used here for personal study only and is not redistributed.

---

## `import_lemma_frequencies.py` — Import corpus frequency data

Imports per-lemma IPM (instances per million) figures from Sketch Engine word-list CSV exports into the `corpus_lemma_frequencies` table.

```bash
# Import all CSVs in a directory:
python scripts/import_lemma_frequencies.py local/data/

# Import specific files (glob supported):
python scripts/import_lemma_frequencies.py local/data/wordlist_*.csv
```

**CSV format** — Sketch Engine word-list export (do not modify the header):
```
"academic use only"
"corpus","preloaded/uktenten22_rft2"
"subcorpus","-"

Item,Frequency,Relative frequency
читати,12345,42.1
писати,9876,33.7
```

The corpus name is extracted from line 2 of the file header. All files in a directory import are processed as separate corpora if their headers differ.

**Behaviour:**
- Safe to rerun: existing `(corpus, lemma)` pairs are skipped (`INSERT OR IGNORE`).

---

## `import_ref_pairs.py` — Import reference aspect pairs

Imports aspect pair references (plain strings, no database links) from a CSV file into the `ref_pairs` table. Used to load textbook data for lookup during manual data entry.

```bash
python scripts/import_ref_pairs.py <csv_file> [--source "Pugh 2009"]
```

**CSV format** — header row required, columns `ipf`, `pf`, `notes` (all optional except at least one of `ipf`/`pf` per row):
```
ipf,pf,notes
читати,прочитати,
говорити,сказати,suppletion
брати,взяти,suppletion
,з'явитися,pf-only
```

**`--source`** — if given, sets the source label for every row in the file, overriding any `source` column in the CSV. If omitted, a `source` column in the CSV is used if present.

**Behaviour:**
- Deduplicates on `(ipf, pf, source)` before inserting.
- Safe to rerun: existing `(ipf, pf, source)` triples are skipped.
- Prints a summary: `N inserted, N skipped`.

**Example:**
```bash
python scripts/import_ref_pairs.py ../local/pairs_pugh.csv --source "Pugh 2009"
```

---

## `scrape_peremova_cefr.py` — Scrape CEFR data from puls.peremova.org

Scrapes headword + CEFR level from [puls.peremova.org/entries](https://puls.peremova.org/entries) and writes a CSV suitable for `import_cefr.py`.

```bash
python scripts/scrape_peremova_cefr.py [--output cefr.csv] [--start-page 1]
```

**Options:**
- `--output` — output CSV path (default: `cefr.csv`)
- `--start-page` — page number to start from (default: 1); use this to resume an interrupted run

**Behaviour:**
- Intentionally slow (10–30 s random delay between requests) to avoid overloading the server.
- Resumable: start from a later page with `--start-page` and concatenate the output files, or re-run from page 1 and deduplicate using `import_cefr.py`'s lowest-level-wins logic.
