"""
Fast author lookup using pre-built local index.
Requires: python server/build_index.py (run once)
"""
import json
import os
import sys
from pathlib import Path
from typing import Dict, List

DATA_DIR = Path(__file__).parent / "data"
INDEX_FILE = DATA_DIR / "author_index.json"
WORKS_FILE = DATA_DIR / "works.jsonl"

# In-memory cache
_author_index: Dict[str, List[str]] = {}
_works: Dict[str, dict] = {}
_loaded = False

def load_data():
    global _author_index, _works, _loaded
    if _loaded:
        return
    
    if not INDEX_FILE.exists() or not WORKS_FILE.exists():
        raise FileNotFoundError(
            f"Index not found. Run: python server/build_index.py first.\n"
            f"Expected files:\n  {INDEX_FILE}\n  {WORKS_FILE}"
        )
    
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        _author_index = json.load(f)
    
    with open(WORKS_FILE, "r", encoding="utf-8") as f:
        for line in f:
            work = json.loads(line)
            _works[work.get("id") or ""] = work
    
    _loaded = True

def add_counts(counts: Dict[str, int], values: List[str]):
    for v in values:
        if v:
            counts[v] = counts.get(v, 0) + 1

def top_counts(counts: Dict[str, int], limit: int = 10):
    return [
        {"name": name, "count": count}
        for name, count in sorted(counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    ]

def get_user_stats(username: str):
    load_data()
    
    username_lower = username.lower().strip()
    work_ids = _author_index.get(username_lower, [])
    
    if not work_ids:
        return {
            "username": username,
            "matchedWorks": 0,
            "totalWords": 0,
            "totalKudos": 0,
            "topFandoms": [],
            "topRelationships": [],
            "topCharacters": [],
            "error": None,
        }
    
    fandom_counts: Dict[str, int] = {}
    relationship_counts: Dict[str, int] = {}
    character_counts: Dict[str, int] = {}
    total_words = 0
    
    for wid in work_ids:
        work = _works.get(wid)
        if not work:
            continue
        total_words += work.get("words", 0) or 0
        add_counts(fandom_counts, work.get("fandoms", []))
        add_counts(relationship_counts, work.get("relationships", []))
        add_counts(character_counts, work.get("characters", []))
    
    return {
        "username": username,
        "matchedWorks": len(work_ids),
        "totalWords": total_words,
        "topFandoms": top_counts(fandom_counts),
        "topRelationships": top_counts(relationship_counts),
        "topCharacters": top_counts(character_counts),
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "username required"}))
        sys.exit(1)
    
    username = sys.argv[1]
    try:
        result = get_user_stats(username)
        print(json.dumps(result))
    except FileNotFoundError as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
