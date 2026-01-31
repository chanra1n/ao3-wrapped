import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any

from datasets import load_dataset

DATASET_ID = os.getenv("AO3_DATASET_ID", "trentmkelly/archiveofourown-meta")
TARGET_YEAR = int(os.getenv("AO3_YEAR", "2025"))
MAX_MATCHES = int(os.getenv("AO3_MAX_MATCHES", "1000"))
STREAMING = os.getenv("AO3_STREAMING", "1") == "1"


def to_year(value: Any):
    if not value:
        return None
    try:
        if isinstance(value, (int, float)):
            # If it looks like a unix timestamp
            if value > 10_000_000_000:
                return datetime.fromtimestamp(value / 1000).year
            if value > 1_000_000_000:
                return datetime.fromtimestamp(value).year
            return None
        if isinstance(value, str):
            # try ISO date or date strings
            return datetime.fromisoformat(value.replace("Z", "+00:00")).year
    except Exception:
        return None
    return None


def add_counts(counts: Dict[str, int], values: List[str]):
    for v in values:
        if not v:
            continue
        counts[v] = counts.get(v, 0) + 1


def top_counts(counts: Dict[str, int], limit: int = 10):
    return [
        {"name": name, "count": count}
        for name, count in sorted(counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    ]


def normalize_list(val: Any):
    if val is None:
        return []
    if isinstance(val, list):
        return [str(v).strip() for v in val if str(v).strip()]
    return [str(val).strip()]


def scrape_dataset(username: str):
    username_lower = username.lower()
    
    dataset = load_dataset(DATASET_ID, split="train", streaming=STREAMING)

    fandom_counts: Dict[str, int] = {}
    relationship_counts: Dict[str, int] = {}
    character_counts: Dict[str, int] = {}

    total_words = 0
    total_kudos = 0
    total_hits = 0
    total_bookmarks = 0
    total_comments = 0
    matched = 0

    for row in dataset:
        authors = normalize_list(row.get("authors") or row.get("author"))
        if not authors:
            continue

        if not any(a.lower() == username_lower for a in authors):
            continue

        # Filter by year when available
        updated_year = to_year(row.get("updated") or row.get("date_updated") or row.get("last_updated"))
        if updated_year is not None and updated_year != TARGET_YEAR:
            continue

        matched += 1
        if matched > MAX_MATCHES:
            break

        total_words += int(row.get("words") or 0)
        total_kudos += int(row.get("kudos") or 0)
        total_hits += int(row.get("hits") or 0)
        total_bookmarks += int(row.get("bookmarks") or 0)
        total_comments += int(row.get("comments") or 0)

        add_counts(fandom_counts, normalize_list(row.get("fandoms") or row.get("fandom")))
        add_counts(relationship_counts, normalize_list(row.get("relationships") or row.get("relationship")))
        add_counts(character_counts, normalize_list(row.get("characters") or row.get("character")))

    return {
        "username": username,
        "year": TARGET_YEAR,
        "matchedWorks": matched,
        "totalWords": total_words,
        "totalKudos": total_kudos,
        "totalHits": total_hits,
        "totalBookmarks": total_bookmarks,
        "totalComments": total_comments,
        "topFandoms": top_counts(fandom_counts),
        "topRelationships": top_counts(relationship_counts),
        "topCharacters": top_counts(character_counts),
        "dataset": DATASET_ID,
        "streaming": STREAMING,
        "maxMatches": MAX_MATCHES,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "username is required"}))
        sys.exit(1)

    username = sys.argv[1]
    try:
        data = scrape_dataset(username)
        print(json.dumps(data))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
