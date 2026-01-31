
import { setFetcher } from '@fujocoded/ao3.js';
import * as cheerio from 'cheerio';

const DELAY_BETWEEN_RETRIES = 2000;
const MAX_RETRIES = 3;

// Resilience: Custom fetcher that mimics browser headers and retries
export const resilientFetch = async (url: string, options: any = {}) => {
    let lastError;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const headers = {
                ...options.headers,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://archiveofourown.org/'
            };

            const response = await fetch(url, { ...options, headers });

            if (response.status === 429) {
                const retryAfter = response.headers.get('retry-after');
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : DELAY_BETWEEN_RETRIES * (i + 1);
                console.log(`[AO3] Rate limited. Waiting ${waitTime}ms...`);
                await new Promise(r => setTimeout(r, waitTime));
                continue;
            }

            if (response.status >= 500 && response.status !== 503) {
                console.warn(`[AO3] Server error ${response.status}. Retrying...`);
                await new Promise(r => setTimeout(r, DELAY_BETWEEN_RETRIES));
                continue;
            }
            
            // 404 is valid (User not found), don't retry unless you think it's an error
            if (response.status === 404) return response;

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (e: any) {
            console.warn(`[AO3] Fetch attempt ${i + 1} failed: ${e.message}`);
            lastError = e;
            await new Promise(r => setTimeout(r, DELAY_BETWEEN_RETRIES));
        }
    }
    throw lastError || new Error('Failed to fetch after retries');
};

export function initAO3() {
    setFetcher(resilientFetch);
}

// Custom Safe User Fetcher that avoids the library's crash on missing profile pics
export async function getSafeUser(username: string) {
    const profileUrl = `https://archiveofourown.org/users/${encodeURIComponent(username)}/profile`;
    
    // Check Profile
    const response = await resilientFetch(profileUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const checkHeader = $("h2.heading").text().trim();
    if (!checkHeader) throw new Error("User not found (or private)");

    // Safe extraction helpers
    const getCount = (name: string) => {
        let val = 0;
        $('#dashboard a').each((_, el) => {
            const txt = $(el).text();
            if (txt.includes(name)) {
                const match = txt.match(/\((\d+)\)/);
                if (match) val = parseInt(match[1]);
            }
        });
        return val;
    };

    return {
        username: checkHeader,
        icon: $("img.icon").attr("src") || null, // Allow null
        joined: $("dl.meta dd").first().text().trim(),
        works: getCount('Works'),
        bookmarks: getCount('Bookmarks'),
        collections: getCount('Collections'),
        url: profileUrl
    };
}
