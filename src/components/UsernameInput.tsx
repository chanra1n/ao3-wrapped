import { useState, useEffect } from 'react';

interface UsernameInputProps {
  onSubmit: (username: string) => void;
  isLoading: boolean;
}

const loadingMessages = [
  'Accessing archive...',
  'Fetching profile...',
  'Analyzing bookmarks...',
  'Crunching numbers...',
];

export function UsernameInput({ onSubmit, isLoading }: UsernameInputProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  // Cycle loading messages
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('USERNAME REQUIRED');
      return;
    }
    setError('');
    onSubmit(username.trim());
  };

  return (
    <div className="min-h-screen punk-bg punk-grid punk-scanlines punk-noise flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Title */}
        <div className="text-center mb-12">
          <p className="punk-kicker mb-3">AO3 // WRAPPED</p>
          <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tight text-(--punk-cream)">
            Archive
          </h1>
          <div className="punk-divider w-24 mx-auto my-4"></div>
          <h2 className="text-4xl md:text-6xl font-black uppercase text-(--punk-red)">
            Year in Review
          </h2>
          <p className="text-(--punk-cream)/70 text-sm mt-4 uppercase tracking-[0.3em]">
            Public bookmarks only • no login required
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="AO3 Username"
            disabled={isLoading}
            className="w-full punk-outline px-8 py-4 text-lg font-bold tracking-wide bg-transparent text-(--punk-cream) placeholder-(--punk-cream)/40 disabled:opacity-50"
          />
          {error && (
            <p className="text-(--punk-magenta) text-xs font-semibold tracking-widest text-center">
              ⚠ {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full punk-outline px-8 py-4 text-sm font-bold uppercase tracking-[0.35em] bg-(--punk-red) text-(--punk-cream) disabled:opacity-70"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="inline-block w-5 h-5 border-2 border-(--punk-cream) border-t-transparent animate-spin" />
                {loadingMessages[loadingMsgIndex]}
              </span>
            ) : (
              '→ REVEAL MY STATS'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
