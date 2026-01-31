"""
AO3 Profile Scraper - Optimized with parallel requests and retry logic.
Accepts up to 10% page loss for speed.
"""
import json
import sys
import time
import math
import cloudscraper
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Configuration
TIMEOUT = 20
MAX_PAGES = 50
PARALLEL_REQUESTS = 3  # How many pages to fetch at once
RETRY_DELAY = 2  # Base delay for retries
MAX_RETRIES = 2  # Fewer retries per page for speed, we'll do a second pass
ACCEPTABLE_LOSS = 0.10  # 10% acceptable page loss

# Thread-safe session creation
_sessions = threading.local()

def get_session():
    """Get or create a thread-local cloudscraper session."""
    if not hasattr(_sessions, 'session'):
        _sessions.session = cloudscraper.create_scraper()
    return _sessions.session


def scrape_profile_stats(username: str) -> dict:
    """Scrape the user's dashboard and profile pages to get counts + joined date."""
    import re
    session = get_session()
    
    url = f"https://archiveofourown.org/users/{username}"
    print(f"[PROFILE] Fetching dashboard: {url}", file=sys.stderr)
    
    response = None
    for attempt in range(3):
        try:
            response = session.get(url, timeout=TIMEOUT)
            print(f"[PROFILE] Status: {response.status_code}", file=sys.stderr)
            if response.status_code == 200:
                break
            if response.status_code == 503:
                time.sleep(RETRY_DELAY * (attempt + 1))
        except Exception as e:
            print(f"[PROFILE] Error: {e}", file=sys.stderr)
            time.sleep(RETRY_DELAY)
    
    stats = {"works": 0, "bookmarks": 0, "series": 0, "collections": 0, "gifts": 0, "joined": ""}
    
    if response and response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        dashboard = soup.select_one("#dashboard")
        if dashboard:
            for link in dashboard.select("a"):
                text = link.text.strip()
                match = re.search(r'\((\d+)\)', text)
                if match:
                    count = int(match.group(1))
                    if "Works" in text:
                        stats["works"] = count
                    elif "Bookmarks" in text:
                        stats["bookmarks"] = count
                    elif "Series" in text:
                        stats["series"] = count
                    elif "Collections" in text:
                        stats["collections"] = count
                    elif "Gifts" in text:
                        stats["gifts"] = count
        
        print(f"[PROFILE] Found: works={stats['works']}, bookmarks={stats['bookmarks']}", file=sys.stderr)
    elif response and response.status_code == 404:
        return None

    # Fetch joined date from the public profile page (retry on 503)
    profile_url = f"https://archiveofourown.org/users/{username}/profile"
    try:
        profile_resp = None
        for attempt in range(3):
            profile_resp = session.get(profile_url, timeout=TIMEOUT)
            print(f"[PROFILE] Profile status: {profile_resp.status_code}", file=sys.stderr)
            if profile_resp.status_code == 200:
                break
            if profile_resp.status_code == 503:
                time.sleep(RETRY_DELAY * (attempt + 1))

        if profile_resp and profile_resp.status_code == 200:
            profile_soup = BeautifulSoup(profile_resp.text, 'html.parser')

            # Primary: meta definition list
            meta_blocks = profile_soup.select("dl.meta, dl.profile, dl.stats")
            for meta in meta_blocks:
                for dt in meta.select("dt"):
                    label = dt.get_text(strip=True).lower().rstrip(":")
                    if "joined" in label or "i joined on" in label:
                        dd = dt.find_next_sibling("dd")
                        if dd:
                            stats["joined"] = dd.get_text(strip=True)
                            break
                if stats["joined"]:
                    break

            # Fallback: time element with datetime (common for dates)
            if not stats["joined"]:
                time_el = profile_soup.select_one("time[datetime]")
                if time_el:
                    stats["joined"] = time_el.get_text(strip=True) or time_el.get("datetime", "").strip()

            # Fallback: any dd that looks like a date
            if not stats["joined"]:
                for dd in profile_soup.select("dl dd"):
                    text = dd.get_text(strip=True)
                    if text and any(ch.isdigit() for ch in text) and "-" in text:
                        stats["joined"] = text
                        break

            if not stats["joined"]:
                first_meta = meta_blocks[0] if meta_blocks else None
                if first_meta:
                    snippet = str(first_meta)[:500]
                    print(f"[PROFILE] Joined not found. meta snippet: {snippet}", file=sys.stderr)
                else:
                    print("[PROFILE] Joined not found. No meta blocks matched.", file=sys.stderr)
            else:
                print(f"[PROFILE] Joined parsed: {stats['joined']}", file=sys.stderr)
    except Exception as e:
        print(f"[PROFILE] Joined parse error: {e}", file=sys.stderr)
    
    return stats


def fetch_single_page(url: str, page_num: int, page_type: str) -> tuple:
    """Fetch a single page. Returns (page_num, html_content, success)."""
    session = get_session()
    
    for attempt in range(MAX_RETRIES):
        try:
            response = session.get(url, timeout=TIMEOUT)
            if response.status_code == 200:
                return (page_num, response.text, True)
            if response.status_code == 503:
                time.sleep(RETRY_DELAY * (attempt + 1))
            elif response.status_code == 404:
                return (page_num, None, False)
        except Exception as e:
            print(f"[{page_type}] Page {page_num} error: {e}", file=sys.stderr)
            time.sleep(RETRY_DELAY)
    
    return (page_num, None, False)


def parse_bookmark(el) -> dict:
    """Parse a bookmark element into structured data."""
    try:
        title = el.select_one("h4.heading a")
        title = title.text.strip() if title else "Unknown"
        
        words = el.select_one("dd.words")
        words = int(words.text.replace(",", "")) if words else 0
        
        fandoms = [f.text for f in el.select(".fandoms a.tag")]
        relationships = [r.text for r in el.select("li.relationships a.tag")]
        
        return {
            "title": title,
            "words": words,
            "fandoms": fandoms,
            "relationships": relationships,
        }
    except Exception:
        return None


def parse_work(el) -> dict:
    """Parse a work element into structured data."""
    try:
        title = el.select_one("h4.heading a")
        title = title.text.strip() if title else "Unknown"
        
        words = el.select_one("dd.words")
        words = int(words.text.replace(",", "")) if words else 0
        
        kudos = el.select_one("dd.kudos a")
        kudos = int(kudos.text.replace(",", "")) if kudos else 0
        
        hits = el.select_one("dd.hits")
        hits = int(hits.text.replace(",", "")) if hits else 0
        
        fandoms = [f.text for f in el.select(".fandoms a.tag")]
        relationships = [r.text for r in el.select("li.relationships a.tag")]
        characters = [c.text for c in el.select("li.characters a.tag")]
        
        return {
            "title": title,
            "words": words,
            "kudos": kudos,
            "hits": hits,
            "fandoms": fandoms,
            "relationships": relationships,
            "characters": characters,
        }
    except Exception:
        return None


def scrape_bookmarks_parallel(username: str, total_bookmarks: int) -> list:
    """Scrape bookmarks using parallel requests with retry for failed pages."""
    bookmarks = []
    failed_pages = []
    
    # Calculate how many pages we need
    per_page = 20  # AO3 shows 20 per page
    total_pages = min(math.ceil(total_bookmarks / per_page), MAX_PAGES)
    max_acceptable_failures = math.ceil(total_pages * ACCEPTABLE_LOSS)
    
    print(f"[BOOKMARKS] Need {total_pages} pages, max {max_acceptable_failures} failures OK", file=sys.stderr)
    
    # Build list of URLs to fetch
    urls = [(f"https://archiveofourown.org/users/{username}/bookmarks?page={p}", p) for p in range(1, total_pages + 1)]
    
    # First pass: parallel fetch
    print(f"[BOOKMARKS] Starting parallel fetch ({PARALLEL_REQUESTS} at a time)...", file=sys.stderr)
    page_results = {}
    
    with ThreadPoolExecutor(max_workers=PARALLEL_REQUESTS) as executor:
        futures = {executor.submit(fetch_single_page, url, page, "BOOKMARKS"): page for url, page in urls}
        
        for future in as_completed(futures):
            page_num, html, success = future.result()
            if success and html:
                page_results[page_num] = html
                print(f"[BOOKMARKS] Page {page_num} ✓", file=sys.stderr)
            else:
                failed_pages.append(page_num)
                print(f"[BOOKMARKS] Page {page_num} ✗ (will retry)", file=sys.stderr)
    
    # Second pass: retry failed pages sequentially (to avoid rate limiting)
    if failed_pages and len(failed_pages) <= max_acceptable_failures * 2:
        print(f"[BOOKMARKS] Retrying {len(failed_pages)} failed pages...", file=sys.stderr)
        time.sleep(3)  # Cool down before retry
        
        for page in failed_pages[:]:
            url = f"https://archiveofourown.org/users/{username}/bookmarks?page={page}"
            page_num, html, success = fetch_single_page(url, page, "RETRY")
            if success and html:
                page_results[page_num] = html
                failed_pages.remove(page)
                print(f"[RETRY] Page {page} ✓", file=sys.stderr)
            else:
                print(f"[RETRY] Page {page} still failed", file=sys.stderr)
            time.sleep(1)  # Gentle delay between retries
    
    # Check if we have acceptable coverage
    success_rate = len(page_results) / total_pages if total_pages > 0 else 1
    print(f"[BOOKMARKS] Got {len(page_results)}/{total_pages} pages ({success_rate*100:.1f}%)", file=sys.stderr)
    
    if success_rate < (1 - ACCEPTABLE_LOSS):
        print(f"[WARNING] Below acceptable threshold, some stats may be incomplete", file=sys.stderr)
    
    # Parse all successful pages
    for page_num in sorted(page_results.keys()):
        soup = BeautifulSoup(page_results[page_num], 'html.parser')
        for bm in soup.select("li.bookmark.blurb"):
            bm_data = parse_bookmark(bm)
            if bm_data:
                bookmarks.append(bm_data)
    
    print(f"[BOOKMARKS] Parsed {len(bookmarks)} bookmarks", file=sys.stderr)
    return bookmarks


def scrape_works_parallel(username: str, total_works: int) -> list:
    """Scrape works using parallel requests."""
    works = []
    
    if total_works == 0:
        return works
    
    per_page = 20
    total_pages = min(math.ceil(total_works / per_page), MAX_PAGES)
    
    print(f"[WORKS] Need {total_pages} pages", file=sys.stderr)
    
    urls = [(f"https://archiveofourown.org/users/{username}/works?page={p}", p) for p in range(1, total_pages + 1)]
    page_results = {}
    
    with ThreadPoolExecutor(max_workers=PARALLEL_REQUESTS) as executor:
        futures = {executor.submit(fetch_single_page, url, page, "WORKS"): page for url, page in urls}
        
        for future in as_completed(futures):
            page_num, html, success = future.result()
            if success and html:
                page_results[page_num] = html
    
    for page_num in sorted(page_results.keys()):
        soup = BeautifulSoup(page_results[page_num], 'html.parser')
        for work in soup.select("li.work.blurb"):
            work_data = parse_work(work)
            if work_data:
                works.append(work_data)
    
    print(f"[WORKS] Parsed {len(works)} works", file=sys.stderr)
    return works


def calculate_stats(username: str, works: list, bookmarks: list, profile_stats: dict) -> dict:
    """Calculate aggregate stats from scraped data."""
    
    # Count fandoms from bookmarks
    fandom_counts = {}
    for b in bookmarks:
        for f in b.get("fandoms", []):
            fandom_counts[f] = fandom_counts.get(f, 0) + 1
    
    # Fallback to works if no bookmarks
    if not fandom_counts:
        for w in works:
            for f in w.get("fandoms", []):
                fandom_counts[f] = fandom_counts.get(f, 0) + 1
    
    top_fandoms = [{"name": k, "count": v} for k, v in sorted(fandom_counts.items(), key=lambda x: -x[1])[:10]]
    
    # Relationships from bookmarks
    rel_counts = {}
    for b in bookmarks:
        for r in b.get("relationships", []):
            rel_counts[r] = rel_counts.get(r, 0) + 1
    if not rel_counts:
        for w in works:
            for r in w.get("relationships", []):
                rel_counts[r] = rel_counts.get(r, 0) + 1
    top_relationships = [{"name": k, "count": v} for k, v in sorted(rel_counts.items(), key=lambda x: -x[1])[:10]]
    
    # Characters from works
    char_counts = {}
    for w in works:
        for c in w.get("characters", []):
            char_counts[c] = char_counts.get(c, 0) + 1
    top_characters = [{"name": k, "count": v} for k, v in sorted(char_counts.items(), key=lambda x: -x[1])[:10]]
    
    return {
        "username": username,
        "url": f"https://archiveofourown.org/users/{username}",
        "icon": "",
        "header": "",
        "joined": profile_stats.get("joined", ""),
        "bio": None,
        "bioHtml": None,
        "works": profile_stats.get("works", len(works)),
        "series": profile_stats.get("series", 0),
        "bookmarks": profile_stats.get("bookmarks", len(bookmarks)),
        "bookmarksScraped": len(bookmarks),
        "collections": profile_stats.get("collections", 0),
        "gifts": profile_stats.get("gifts", 0),
        "topFandoms": top_fandoms,
        "topCharacters": top_characters,
        "topRelationships": top_relationships,
        "totalWordsRead": sum(b.get("words", 0) for b in bookmarks),
        "totalWordsWritten": sum(w.get("words", 0) for w in works),
        "totalKudos": sum(w.get("kudos", 0) for w in works),
        "totalHits": sum(w.get("hits", 0) for w in works),
        "mostPopularWork": max(works, key=lambda w: w.get("kudos", 0)) if works else None,
    }


def scrape_quick(username: str) -> dict:
    """Quick scrape - just dashboard stats, instant."""
    profile_stats = scrape_profile_stats(username)
    
    if profile_stats is None:
        return {"error": f"User '{username}' not found"}
    
    return {
        "username": username,
        "url": f"https://archiveofourown.org/users/{username}",
        "icon": "",
        "header": "",
        "joined": profile_stats.get("joined", ""),
        "bio": None,
        "bioHtml": None,
        "works": profile_stats.get("works", 0),
        "series": profile_stats.get("series", 0),
        "bookmarks": profile_stats.get("bookmarks", 0),
        "collections": profile_stats.get("collections", 0),
        "gifts": profile_stats.get("gifts", 0),
        "topFandoms": [],
        "topCharacters": [],
        "topRelationships": [],
        "totalWordsRead": 0,
        "totalWordsWritten": 0,
        "totalKudos": 0,
        "totalHits": 0,
        "mostPopularWork": None,
        "isQuickData": True,
    }


def scrape_full(username: str) -> dict:
    """Full scrape with parallel requests and retry logic."""
    print(f"[FULL] Starting optimized scrape for {username}", file=sys.stderr)
    
    profile_stats = scrape_profile_stats(username)
    if profile_stats is None:
        return {"error": f"User '{username}' not found"}
    
    total_bookmarks = profile_stats.get("bookmarks", 0)
    total_works = profile_stats.get("works", 0)
    
    # Parallel scrape
    bookmarks = scrape_bookmarks_parallel(username, total_bookmarks) if total_bookmarks > 0 else []
    works = scrape_works_parallel(username, total_works) if total_works > 0 else []
    
    return calculate_stats(username, works, bookmarks, profile_stats)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No username provided"}))
        sys.exit(1)
    
    username = sys.argv[1]
    quick_mode = "--quick" in sys.argv
    
    print(f"[MAIN] ========================================", file=sys.stderr)
    print(f"[MAIN] {'QUICK' if quick_mode else 'FULL (parallel)'} scrape: \"{username}\"", file=sys.stderr)
    print(f"[MAIN] ========================================", file=sys.stderr)
    
    start_time = time.time()
    
    if quick_mode:
        result = scrape_quick(username)
    else:
        result = scrape_full(username)
    
    elapsed = time.time() - start_time
    print(f"[MAIN] Completed in {elapsed:.1f}s", file=sys.stderr)
    print(json.dumps(result))
