"""
Pre-download AO3 dataset and build a local author index for instant lookups.
Run once: python server/build_index.py
"""
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

from datasets import load_dataset
from tqdm import tqdm

DATASET_ID = os.getenv("AO3_DATASET_ID", "trentmkelly/archiveofourown-meta")
OUTPUT_DIR = Path(__file__).parent / "data"
INDEX_FILE = OUTPUT_DIR / "author_index.json"
WORKS_FILE = OUTPUT_DIR / "works.jsonl"

def normalize_list(val):
    if val is None:
        return []
    if isinstance(val, list):
        return [str(v).strip() for v in val if str(v).strip()]
    if isinstance(val, str):
        return [val.strip()] if val.strip() else []
    return []

def extract_author(row):
    # The dataset has varying schemas
    meta = row.get("metadata", {})
    author = meta.get("author", "")
    if author and author.startswith("by "):
        author = author[3:]
    return author.strip().lower() if author else None

def extract_work(row):
    meta = row.get("metadata", {})
    
    def safe_int(val):
        if not val:
            return 0
        try:
            return int(str(val).replace(",", ""))
        except:
            return 0
    
    return {
        "id": row.get("id"),
        "title": row.get("title"),
        "author": extract_author(row),
        "words": safe_int(meta.get("words")),
        "fandoms": normalize_list(meta.get("Fandom") or meta.get("Fandoms")),
        "relationships": normalize_list(meta.get("Relationship") or meta.get("Relationships")),
        "characters": normalize_list(meta.get("Character") or meta.get("Characters")),
        "rating": meta.get("Rating"),
        "category": meta.get("Category"),
    }

def main():
    print(f"Loading dataset: {DATASET_ID}")
    print("This will take several minutes on first run...")
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Stream and process
    ds = load_dataset(DATASET_ID, split="train", streaming=True)
    
    author_index = defaultdict(list)  # author -> [work_ids]
    works = {}  # id -> work data
    
    count = 0
    for row in tqdm(ds, desc="Processing works"):
        work = extract_work(row)
        author = work.get("author")
        work_id = work.get("id") or str(count)
        
        if author:
            author_index[author].append(work_id)
        
        works[work_id] = work
        count += 1
        
        # Progress checkpoint every 100k
        if count % 100000 == 0:
            print(f"Processed {count} works, {len(author_index)} unique authors...")
    
    print(f"\nTotal: {count} works, {len(author_index)} authors")
    
    # Save works as JSONL
    print(f"Saving works to {WORKS_FILE}...")
    with open(WORKS_FILE, "w", encoding="utf-8") as f:
        for work_id, work in works.items():
            f.write(json.dumps(work, default=str) + "\n")
    
    # Save author index
    print(f"Saving author index to {INDEX_FILE}...")
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(dict(author_index), f)
    
    print("Done! You can now run the server for instant lookups.")

if __name__ == "__main__":
    main()
