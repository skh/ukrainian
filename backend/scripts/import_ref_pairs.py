#!/usr/bin/env python3
"""Import aspect pair references from a CSV file.

Usage:
    python scripts/import_ref_pairs.py <csv_file> [--source "Pugh 2009"]

CSV must have a header row. Expected columns: ipf, pf, notes (all optional
except at least one of ipf/pf per row must be non-empty). A 'source' column
is also accepted; --source overrides it for every row.
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.ref_pair import RefPair


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_file", help="Path to CSV file")
    parser.add_argument("--source", default=None, help="Source label for all rows (overrides CSV column)")
    args = parser.parse_args()

    rows = []
    with open(args.csv_file, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            ipf    = row.get('ipf', '').strip() or None
            pf     = row.get('pf', '').strip() or None
            source = args.source or row.get('source', '').strip() or None
            notes  = row.get('notes', '').strip() or None
            if not ipf and not pf:
                print(f"Row {i}: skipping — both ipf and pf are empty")
                continue
            rows.append((ipf, pf, source, notes))

    # Deduplicate on (ipf, pf, source)
    seen: set[tuple] = set()
    deduped = []
    for r in rows:
        key = (r[0], r[1], r[2])
        if key not in seen:
            seen.add(key)
            deduped.append(r)

    db = SessionLocal()
    inserted = skipped = 0
    try:
        for ipf, pf, source, notes in deduped:
            exists = db.query(RefPair).filter(
                RefPair.ipf == ipf,
                RefPair.pf == pf,
                RefPair.source == source,
            ).first()
            if exists:
                skipped += 1
                continue
            db.add(RefPair(ipf=ipf, pf=pf, source=source, notes=notes))
            inserted += 1
        db.commit()
    finally:
        db.close()

    print(f"Done: {inserted} inserted, {skipped} skipped (already present)")


if __name__ == "__main__":
    main()
