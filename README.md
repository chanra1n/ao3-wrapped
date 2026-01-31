# AO3 Wrapped 📚

A Spotify Wrapped-style web application that displays your reading statistics from Archive of Our Own (AO3). Discover your most-read fandoms, favorite authors, and reading habits in a beautiful, animated presentation.

## ✨ Features

- **Real AO3 data** - Fetches actual user profile data from AO3
- **Username-based lookup** - Enter your AO3 username to get your personalized stats
- **Animated slides** - Spotify Wrapped-inspired card transitions
- **Profile statistics** - See your works, bookmarks, series, and collections

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

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
| `npm run dev:all` | Run both frontend and backend |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## 🛠️ Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling
- **Framer Motion** - Animations
- **Express** - Backend API server
- **@fujocoded/ao3.js** - AO3 data scraping library

## 🔌 Architecture

```
┌─────────────────────────────────────┐
│     Browser (React + Vite)          │
│     http://localhost:5173           │
└─────────────────┬───────────────────┘
                  │ HTTP API calls
                  ▼
┌─────────────────────────────────────┐
│     Backend (Express + ao3.js)      │
│     http://localhost:3001           │
└─────────────────┬───────────────────┘
                  │ HTML Scraping
                  ▼
┌─────────────────────────────────────┐
│     archiveofourown.org             │
└─────────────────────────────────────┘
```

## ⚠️ AO3 Data Limitations

AO3 does not have an official public API. This app scrapes public profile data:

- ✅ **Available:** Username, profile picture, join date, bio, works count, bookmarks count, series, collections, gifts
- ❌ **Not available without login:** Reading history, kudos given, specific bookmark/work details

The backend includes:
- Rate limiting (1 second between requests)
- 5-minute caching to reduce load on AO3
- Fallback parsing if the ao3.js library fails

## 📁 Project Structure

```
├── server/
│   └── index.ts            # Express backend with AO3 API
├── src/
│   ├── components/
│   │   ├── UsernameInput.tsx   # Username input form
│   │   └── StatsSlide.tsx      # Animated statistics slides
│   ├── services/
│   │   └── ao3Service.ts       # Frontend API client
│   ├── types/
│   │   └── ao3.ts              # TypeScript type definitions
│   ├── App.tsx                 # Main application component
│   └── index.css               # Global styles with Tailwind
└── package.json
```

## 🎨 Customization

The app uses CSS custom properties for theming. You can modify the gradients and colors in `src/index.css`:

```css
:root {
  --ao3-red: #990000;
  --gradient-1: #667eea;
  --gradient-2: #764ba2;
}
```

## 📄 License

MIT License - feel free to use this for your own projects!

## 🙏 Acknowledgments

- Inspired by [Spotify Wrapped](https://www.spotify.com/wrapped/)
- Built for the [Archive of Our Own](https://archiveofourown.org/) community
