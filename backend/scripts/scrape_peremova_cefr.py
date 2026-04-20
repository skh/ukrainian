"""Scrape headword + CEFR level from puls.peremova.org/entries.

Usage:
    python scripts/scrape_peremova_cefr.py [--output cefr.csv] [--start-page 1]

The script is intentionally slow (10–30 s between requests) to be a polite guest.
Resumable: pass --start-page to continue from where you left off.
"""
import argparse
import csv
import random
import sys
import time

import httpx
from bs4 import BeautifulSoup

BASE_URL = "https://puls.peremova.org/entries"
CEFR_LEVELS = {"A1", "A2", "B1", "B2", "C1", "C2"}
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "uk,en;q=0.9",
}


def fetch_page(client: httpx.Client, page: int) -> BeautifulSoup:
    resp = client.get(BASE_URL, params={"page": page}, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def parse_entries(soup: BeautifulSoup) -> list[dict]:
    """Return list of {lemma, cefr} dicts from one page."""
    entries = []
    for row in soup.select("tr.entry"):
        link = row.select_one("td:first-child a")
        if not link:
            continue
        lemma = link.get_text(strip=True)
        level_cell = row.select_one("td[class*='level-cell']")
        cefr = level_cell.get_text(strip=True) if level_cell else None
        if lemma and cefr in CEFR_LEVELS:
            entries.append({"lemma": lemma, "cefr": cefr})
    return entries


def total_pages(soup: BeautifulSoup) -> int:
    """Read the highest page number from the pagination links."""
    nums = []
    for a in soup.select("nav a[href*='page='], .pagination a[href*='page=']"):
        try:
            nums.append(int(a["href"].split("page=")[-1].split("&")[0]))
        except (ValueError, KeyError):
            pass
    return max(nums) if nums else 1


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--output", default="cefr.csv", help="Output CSV file (default: cefr.csv)")
    parser.add_argument("--start-page", type=int, default=1, metavar="N", help="Resume from page N (default: 1)")
    args = parser.parse_args()

    mode = "a" if args.start_page > 1 else "w"
    if mode == "w":
        print(f"Writing to {args.output}")
    else:
        print(f"Appending to {args.output} (resuming from page {args.start_page})")

    with httpx.Client(follow_redirects=True) as client, \
         open(args.output, mode, newline="", encoding="utf-8") as f:

        writer = csv.DictWriter(f, fieldnames=["lemma", "cefr"])
        if mode == "w":
            writer.writeheader()

        # Fetch first page to learn total pages
        print(f"  Fetching page {args.start_page} …", end=" ", flush=True)
        soup = fetch_page(client, args.start_page)
        n_pages = total_pages(soup)
        entries = parse_entries(soup)
        writer.writerows(entries)
        f.flush()
        print(f"{len(entries)} entries  [{args.start_page}/{n_pages}]")

        for page in range(args.start_page + 1, n_pages + 1):
            delay = random.uniform(10, 30)
            print(f"  Waiting {delay:.0f}s …", end=" ", flush=True)
            time.sleep(delay)

            print(f"Fetching page {page} …", end=" ", flush=True)
            try:
                soup = fetch_page(client, page)
            except httpx.HTTPError as e:
                print(f"ERROR: {e} — skipping page {page}")
                continue

            entries = parse_entries(soup)
            writer.writerows(entries)
            f.flush()
            print(f"{len(entries)} entries  [{page}/{n_pages}]")

    print(f"\nDone. Results written to {args.output}")


if __name__ == "__main__":
    main()
