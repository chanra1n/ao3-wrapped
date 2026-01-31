import json
import sys
import time
from typing import Dict, List

import requests
from bs4 import BeautifulSoup

BASE = "https://archiveofourown.org"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.8",
    "Referer": BASE + "/",
}


def fetch_html(url: str, retries: int = 1, backoff: float = 1.0) -> str:
    last_err = None
    for i in range(retries + 1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=8)
            if resp.status_code == 429:
                time.sleep(backoff * (i + 1))
                continue
            resp.raise_for_status()
            return resp.text
        except Exception as e:
            last_err = e
            time.sleep(backoff * (i + 1))
    raise last_err


def parse_dashboard_count(soup: BeautifulSoup, label: str) -> int:
    for a in soup.select("#dashboard a"):
        text = a.get_text(strip=True)
        if label in text:
            if "(" in text and ")" in text:
                try:
                    return int(text.split("(")[-1].split(")")[0].replace(",", ""))
                except Exception:
                    return 0
    return 0


def add_counts(counts: Dict[str, int], items: List[str]) -> None:
    for item in items:
        if not item:
            continue
        counts[item] = counts.get(item, 0) + 1


def top_counts(counts: Dict[str, int], limit: int = 10):
    return [
        {"name": name, "count": count}
        for name, count in sorted(counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    ]


def parse_bookmark_page(html: str):
    soup = BeautifulSoup(html, "lxml")
    words = 0
    fandoms = []
    ships = []
    chars = []

    for blurb in soup.select(".bookmark.blurb"):
        word_el = blurb.select_one("dd.words")
        if word_el and word_el.text:
            try:
                words += int(word_el.text.strip().replace(",", ""))
            except Exception:
                pass
        fandoms.extend([a.get_text(strip=True) for a in blurb.select(".fandoms a")])
        ships.extend([a.get_text(strip=True) for a in blurb.select("li.relationships a")])
        chars.extend([a.get_text(strip=True) for a in blurb.select("li.characters a")])

    return words, fandoms, ships, chars


def scrape(username: str):
    profile_url = f"{BASE}/users/{username}/profile"
    profile_html = fetch_html(profile_url)
    profile = BeautifulSoup(profile_html, "lxml")

    heading = profile.select_one("h2.heading")
    if not heading:
        raise ValueError("User not found or profile blocked")

    icon = ""
    icon_el = profile.select_one("img.icon")
    if icon_el and icon_el.get("src"):
        icon = icon_el.get("src")
        if icon.startswith("/"):
            icon = BASE + icon

    user_data = {
        "username": heading.get_text(strip=True),
        "icon": icon,
        "joined": (profile.select_one("dl.meta dd").get_text(strip=True) if profile.select_one("dl.meta dd") else ""),
        "works": parse_dashboard_count(profile, "Works"),
        "bookmarks": parse_dashboard_count(profile, "Bookmarks"),
        "collections": parse_dashboard_count(profile, "Collections"),
        "gifts": parse_dashboard_count(profile, "Gifts"),
        "url": f"{BASE}/users/{username}",
    }

    total_words = 0
    fandom_counts: Dict[str, int] = {}
    ship_counts: Dict[str, int] = {}
    char_counts: Dict[str, int] = {}

    for page in [1, 2]:
        bm_url = f"{BASE}/users/{username}/bookmarks?page={page}"
        html = fetch_html(bm_url)
        words, fandoms, ships, chars = parse_bookmark_page(html)
        total_words += words
        add_counts(fandom_counts, fandoms)
        add_counts(ship_counts, ships)
        add_counts(char_counts, chars)

    return {
        **user_data,
        "totalWordsRead": total_words,
        "topFandoms": top_counts(fandom_counts),
        "topRelationships": top_counts(ship_counts),
        "topCharacters": top_counts(char_counts),
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "username is required"}))
        sys.exit(1)

    username = sys.argv[1]
    try:
        data = scrape(username)
        print(json.dumps(data))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
