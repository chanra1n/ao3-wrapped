
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Separate caches for quick stats and full data
const quickCache = new Map();
const fullCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

// Track in-progress scrapes to avoid duplicates
const inProgressScrapes = new Map<string, Promise<any>>();

const pythonExe = process.env.AO3_PYTHON || path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
const scraperPath = path.join(process.cwd(), 'server', 'ao3_profile_scraper.py');
const SCRAPE_TIMEOUT_MS = Number(process.env.AO3_TIMEOUT_MS || 300000); // 5 min for full profile scrape

const runPythonScraper = (username: string, mode: 'quick' | 'full' = 'full') => new Promise((resolve, reject) => {
    console.log(`[SPAWN] Checking Python at: ${pythonExe}`);
    if (!fs.existsSync(pythonExe)) {
        console.error(`[SPAWN] Python NOT FOUND!`);
        return reject(new Error(`Python not found at ${pythonExe}`));
    }
    
    console.log(`[SPAWN] Checking scraper at: ${scraperPath}`);
    if (!fs.existsSync(scraperPath)) {
        console.error(`[SPAWN] Scraper NOT FOUND!`);
        return reject(new Error(`Scraper not found at ${scraperPath}`));
    }

    const args = [scraperPath, username];
    if (mode === 'quick') {
        args.push('--quick');
    }
    
    console.log(`[SPAWN] Spawning: ${pythonExe} ${args.join(' ')}`);
    const proc = spawn(pythonExe, args, {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log(`[STDOUT] ${chunk.substring(0, 200)}${chunk.length > 200 ? '...' : ''}`);
    });
    proc.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        console.log(`[STDERR] ${chunk}`);
    });

    const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`Python scraper timed out after ${SCRAPE_TIMEOUT_MS}ms`));
    }, SCRAPE_TIMEOUT_MS);

    proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
    });
    proc.on('close', (code) => {
        clearTimeout(timeout);
        console.log(`[SPAWN] Process exited with code: ${code}`);
        
        if (code !== 0) {
            console.error(`[SPAWN] Non-zero exit! stderr: ${stderr}`);
            return reject(new Error(stderr || 'Python scraper failed'));
        }
        try {
            const parsed = JSON.parse(stdout);
            if (parsed?.error) {
                return reject(new Error(parsed.error));
            }
            resolve(parsed);
        } catch (e) {
            console.error(`[PARSE] JSON parse failed! Raw stdout: ${stdout.substring(0, 500)}`);
            reject(new Error('Invalid JSON from python scraper'));
        }
    });
});

const hasJoined = (data: any) => Boolean(data && typeof data.joined === 'string' && data.joined.trim().length > 0);

// Quick endpoint - just fetches dashboard stats (instant)
app.get('/api/user/:username/quick', async (req, res) => {
    const { username } = req.params;
    console.log(`[QUICK] Request for "${username}"`);

    if (
        quickCache.has(username) &&
        Date.now() - quickCache.get(username).timestamp < CACHE_TTL &&
        hasJoined(quickCache.get(username).data)
    ) {
        console.log(`[QUICK] Cache HIT`);
        return res.json(quickCache.get(username).data);
    }

    try {
        const data = await runPythonScraper(username, 'quick');
        quickCache.set(username, { data, timestamp: Date.now() });
        
        // Start full scrape in background if not already running
        if (!inProgressScrapes.has(username)) {
            console.log(`[QUICK] Starting background full scrape for "${username}"`);
            const fullScrapePromise = runPythonScraper(username, 'full')
                .then(fullData => {
                    fullCache.set(username, { data: fullData, timestamp: Date.now() });
                    console.log(`[BACKGROUND] Full scrape complete for "${username}"`);
                })
                .catch(err => console.error(`[BACKGROUND] Full scrape failed: ${err.message}`))
                .finally(() => inProgressScrapes.delete(username));
            inProgressScrapes.set(username, fullScrapePromise);
        }
        
        res.json(data);
    } catch (e: any) {
        console.error(`[QUICK] Error: ${e.message}`);
        res.status(500).json({ error: e.message || 'Failed to fetch data' });
    }
});

// Full data endpoint - returns cached full data or waits for scrape
app.get('/api/user/:username/details', async (req, res) => {
    const { username } = req.params;
    console.log(`[DETAILS] Request for "${username}"`);

    // Check full cache first
    if (
        fullCache.has(username) &&
        Date.now() - fullCache.get(username).timestamp < CACHE_TTL &&
        hasJoined(fullCache.get(username).data)
    ) {
        console.log(`[DETAILS] Cache HIT`);
        return res.json(fullCache.get(username).data);
    }

    // If there's an in-progress scrape, wait for it
    if (inProgressScrapes.has(username)) {
        console.log(`[DETAILS] Waiting for in-progress scrape...`);
        await inProgressScrapes.get(username);
        if (fullCache.has(username)) {
            return res.json(fullCache.get(username).data);
        }
    }

    // Otherwise start a new full scrape
    try {
        const data = await runPythonScraper(username, 'full');
        fullCache.set(username, { data, timestamp: Date.now() });
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Failed to fetch data' });
    }
});

// Legacy endpoint - full scrape (for backwards compat)
app.get('/api/user/:username', async (req, res) => {
    const { username } = req.params;

    console.log(`\n========================================`);
    console.log(`[REQUEST] Received request for username: "${username}"`);
    console.log(`========================================`);

    if (
        fullCache.has(username) &&
        Date.now() - fullCache.get(username).timestamp < CACHE_TTL &&
        hasJoined(fullCache.get(username).data)
    ) {
        console.log(`[CACHE] Cache HIT for "${username}"`);
        return res.json(fullCache.get(username).data);
    }

    try {
        const data = await runPythonScraper(username);
        fullCache.set(username, { data, timestamp: Date.now() });
        res.json(data);
    } catch (e: any) {
        console.error(`[ERROR] Failed for username: "${username}": ${e.message}`);
        res.status(500).json({ error: e.message || 'Failed to fetch data' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', engine: 'python' });
});

app.listen(PORT, () => console.log(`AO3 Python-backed server running on ${PORT}`));
