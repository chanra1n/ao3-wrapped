import { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { UsernameInput } from './components/UsernameInput';
import { StatsSlide } from './components/StatsSlide';
import { fetchUserStatsQuick, fetchUserStatsDetails } from './services/ao3Service';
import type { UserStats } from './types/ao3';
import './index.css';

// Slide names for URLs and titles
const SLIDE_SLUGS = ['profile', 'library', 'words', 'fandoms', 'ships', 'characters', 'creations', 'wrapped'];
const SLIDE_TITLES = ['Profile', 'Library', 'Words Read', 'Top Fandoms', 'Ships', 'Characters', 'Creations', 'Wrapped'];
const TOTAL_SLIDES = SLIDE_SLUGS.length;

// Custom hook for page titles
function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

// Home page component
function HomePage() {
  useDocumentTitle('AO3 Wrapped - Your Year in Review');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (username: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Quick validation - check if user exists
      await fetchUserStatsQuick(username);
      // Navigate to user's wrapped page (first slide)
      navigate(`/${encodeURIComponent(username)}/${SLIDE_SLUGS[0]}`);
    } catch {
      setError('Failed to find that user. Please check the username and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 punk-bg punk-grid punk-scanlines punk-noise">
        <div className="punk-panel p-8 text-center space-y-4">
          <p className="text-[1.1rem] font-semibold uppercase tracking-wide">{error}</p>
          <button
            onClick={() => setError(null)}
            className="punk-outline px-6 py-3 bg-[var(--punk-cream)] text-[var(--punk-black)] font-bold uppercase tracking-widest"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <UsernameInput onSubmit={handleSubmit} isLoading={isLoading} />;
}

// User wrapped page component
function UserWrappedPage() {
  const { username, slide } = useParams<{ username: string; slide?: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine current slide from URL
  const currentSlide = slide ? SLIDE_SLUGS.indexOf(slide) : 0;
  const validSlide = currentSlide >= 0 && currentSlide < TOTAL_SLIDES;

  // Set page title based on username and slide
  useDocumentTitle(
    stats 
      ? `${stats.user.username} - ${SLIDE_TITLES[currentSlide] || 'Wrapped'} | AO3 Wrapped`
      : `Loading ${username}... | AO3 Wrapped`
  );

  // Redirect to first slide if no slide specified or invalid slide
  useEffect(() => {
    if (username && (!slide || !validSlide)) {
      navigate(`/${encodeURIComponent(username)}/${SLIDE_SLUGS[0]}`, { replace: true });
    }
  }, [username, slide, validSlide, navigate]);

  // Load user stats on mount
  useEffect(() => {
    if (!username) return;

    const loadStats = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const quickStats = await fetchUserStatsQuick(username);
        setStats(quickStats);
      } catch {
        setError('Failed to fetch stats for this user.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [username]);

  // Load full details in background once we have quick stats
  useEffect(() => {
    if (stats && username && !isLoadingDetails && stats.topFandoms.length === 0) {
      setIsLoadingDetails(true);
      fetchUserStatsDetails(username)
        .then((fullStats) => {
          setStats(fullStats);
        })
        .catch((err) => {
          console.error('Failed to load full details:', err);
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    }
  }, [stats, username, isLoadingDetails]);

  const handleNext = () => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      navigate(`/${encodeURIComponent(username!)}/${SLIDE_SLUGS[currentSlide + 1]}`);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      navigate(`/${encodeURIComponent(username!)}/${SLIDE_SLUGS[currentSlide - 1]}`);
    }
  };

  const handleRestart = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 punk-bg punk-grid punk-scanlines punk-noise">
        <div className="punk-panel p-8 text-center space-y-4">
          <div className="flex justify-center">
            <span className="inline-block w-8 h-8 border-3 border-(--punk-cream) border-t-transparent animate-spin" />
          </div>
          <p className="text-lg uppercase tracking-widest">Loading {username}...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 punk-bg punk-grid punk-scanlines punk-noise">
        <div className="punk-panel p-8 text-center space-y-4">
          <p className="text-[1.1rem] font-semibold uppercase tracking-wide">{error || 'User not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="punk-outline px-6 py-3 bg-[var(--punk-cream)] text-[var(--punk-black)] font-bold uppercase tracking-widest"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <StatsSlide
      stats={stats}
      currentSlide={currentSlide}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onRestart={handleRestart}
      isLoadingDetails={isLoadingDetails}
    />
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/:username" element={<UserWrappedPage />} />
      <Route path="/:username/:slide" element={<UserWrappedPage />} />
    </Routes>
  );
}

export default App;
