# AO3 Wrapped 📚

A Spotify Wrapped-style web application that displays your reading statistics from Archive of Our Own (AO3). Discover your most-read fandoms, favorite ships, top characters, and reading habits in a beautiful, animated presentation.

## ✨ Features

- **Real AO3 data** - Fetches actual user profile and bookmark data from AO3
- **Username-based lookup** - Enter your AO3 username to get your personalized stats
- **8 animated slides** - Spotify Wrapped-inspired card transitions with Framer Motion
  - Profile overview with join date and bio
  - Library stats (bookmarks, series, collections, gifts)
  - Words read breakdown with charts
  - Top fandoms analysis
  - Favorite ships/relationships
  - Top characters
  - Your creations (works you've written)
  - Final wrapped summary
- **Progressive loading** - Quick stats load instantly, detailed analysis loads in background
- **Shareable URLs** - Each slide has a unique URL (e.g., `/username/fandoms`)
- **Charts & visualizations** - Bar charts and doughnut charts powered by Chart.js

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Python 3.8+ with pip (for the scraper backend)
- npm or yarn

### Installation

```bash
# Install Node.js dependencies
npm install

# Set up Python virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install Python dependencies
pip install cloudscraper beautifulsoup4

# Start both frontend and backend
npm run dev:all

# Or run separately:
npm run server  # Backend API (port 3001)
npm run dev     # Frontend (port 5173)
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite frontend dev server |
| `npm run server` | Start Express backend API |
| `npm run dev:all` | Run both frontend and backend concurrently |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite 7** - Build tool
- **Tailwind CSS v4** - Styling with custom punk/retro theme
- **Framer Motion** - Smooth slide animations
- **Chart.js + react-chartjs-2** - Data visualizations
- **Lucide React** - Icons
- **React Router v7** - Client-side routing

### Backend
- **Express 5** - API server
- **Python + BeautifulSoup** - AO3 profile scraper
- **Cloudscraper** - Bypasses Cloudflare protection on AO3

## 🔌 Architecture

```
┌─────────────────────────────────────┐
│     Browser (React + Vite)          │
│     http://localhost:5173           │
│     Routes: /, /:username/:slide    │
└─────────────────┬───────────────────┘
                  │ HTTP API calls
                  ▼
┌─────────────────────────────────────┐
│     Express API Server              │
│     http://localhost:3001           │
│     /api/user/:username/quick       │
│     /api/user/:username/details     │
└─────────────────┬───────────────────┘
                  │ Spawns subprocess
                  ▼
┌─────────────────────────────────────┐
│     Python Scraper                  │
│     ao3_profile_scraper.py          │
│     - Parallel page fetching        │
│     - Retry logic with backoff      │
└─────────────────┬───────────────────┘
                  │ HTML Scraping
                  ▼
┌─────────────────────────────────────┐
│     archiveofourown.org             │
└─────────────────────────────────────┘
```

## ⚠️ AO3 Data Limitations

AO3 does not have an official public API. This app scrapes public profile data:

### ✅ Available (public bookmarks)
- Username, profile picture, join date, bio
- Works count, bookmarks count, series, collections, gifts
- Top fandoms (from bookmarked works)
- Favorite ships/relationships
- Top characters
- Total words read (estimated from bookmarks)
- Your written works stats

### ❌ Not available without login
- Private bookmarks
- Reading history (marked for later)
- Kudos you've given
- Subscription details

### Backend features
- **10-minute caching** to reduce load on AO3
- **Parallel scraping** - Fetches up to 3 pages simultaneously
- **Retry logic** with exponential backoff for 503 errors
- **Quick/Full modes** - Quick stats for instant feedback, full scrape for details
- **Background processing** - Full data loads while you view quick stats

## 📁 Project Structure

```
├── server/
│   ├── index.ts                # Express API with quick/full endpoints
│   ├── ao3_profile_scraper.py  # Python scraper (main)
│   ├── ao3_scraper.py          # Alternative scraper
│   ├── ao3_local.py            # Local testing utilities
│   └── build_index.py          # Index builder
├── src/
│   ├── components/
│   │   ├── UsernameInput.tsx   # Username input form
│   │   └── StatsSlide.tsx      # All 8 animated slide types
│   ├── services/
│   │   └── ao3Service.ts       # Frontend API client
│   ├── types/
│   │   └── ao3.ts              # TypeScript type definitions
│   ├── App.tsx                 # Main app with React Router
│   ├── App.css                 # Component styles
│   └── index.css               # Global styles + Tailwind
├── public/                     # Static assets
└── package.json
```

## 🎨 Slide Types

| Slide | Route | Description |
|-------|-------|-------------|
| Profile | `/username/profile` | Avatar, username, join date, bio |
| Library | `/username/library` | Bookmarks, series, collections, gifts |
| Words | `/username/words` | Total words read with breakdown |
| Fandoms | `/username/fandoms` | Top 5 fandoms with charts |
| Ships | `/username/ships` | Favorite relationships |
| Characters | `/username/characters` | Most-read characters |
| Creations | `/username/creations` | Your written works stats |
| Wrapped | `/username/wrapped` | Final summary card |


## 📄 License

MIT License - feel free to use this for your own projects!

## 🙏 Acknowledgments

- Inspired by [Spotify Wrapped](https://www.spotify.com/wrapped/)
- Built for the [Archive of Our Own](https://archiveofourown.org/) community
