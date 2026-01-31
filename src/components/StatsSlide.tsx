import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserStats } from '../types/ao3';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Bookmark,
  BookOpen,
  Heart,
  Users,
  Sparkles,
  TrendingUp,
  Award,
  Star,
  Calendar,
  Globe,
  Flame,
  PenTool,
  Share2,
  Check,
  Link,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const THEME = {
  cream: '#f8f5e8',
  black: '#0b0b0d',
  charcoal: '#121214',
  red: '#c9142f',
  yellow: '#f5c518',
  cyan: '#2de2e6',
  magenta: '#ff2e88',
  grid: 'rgba(248, 245, 232, 0.12)',
};

ChartJS.defaults.font.family = 'Space Grotesk, sans-serif';
ChartJS.defaults.color = THEME.cream;
ChartJS.defaults.borderColor = THEME.grid;

const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: THEME.cream,
        boxWidth: 12,
        padding: 16,
        font: { size: 12, weight: '600' as const },
      },
    },
    tooltip: {
      backgroundColor: THEME.charcoal,
      titleColor: THEME.cream,
      bodyColor: THEME.cream,
      borderColor: THEME.cream,
      borderWidth: 1,
      padding: 10,
    },
  },
  scales: {
    x: { grid: { color: THEME.grid }, ticks: { color: THEME.cream } },
    y: { grid: { color: THEME.grid }, ticks: { color: THEME.cream } },
  },
};

interface StatsSlideProps {
  stats: UserStats;
  currentSlide: number;
  onNext: () => void;
  onPrevious: () => void;
  onRestart: () => void;
  isLoadingDetails?: boolean;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 150 : -150,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 150 : -150,
    opacity: 0,
  }),
};

const swipeConfidenceThreshold = 9000;
const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

function PunkLoader({ label }: { label: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <div className="punk-panel px-6 py-4 text-center space-y-3">
        <div className="text-xs uppercase tracking-[0.3em] text-(--punk-yellow)">Loading</div>
        <div className="text-xl font-bold uppercase">{label}</div>
        <div className="h-1 w-32 bg-(--punk-cream)/20 overflow-hidden">
          <div className="h-full w-1/2 bg-(--punk-red) animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

function ShareButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const currentUrl = window.location.href;
  const shareText = `Check out my AO3 Wrapped for ${username}!`;

  const handleShare = async () => {
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${username}'s AO3 Wrapped`,
          text: shareText,
          url: currentUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fall through to menu
      }
    }
    
    // Show share menu on desktop
    setShowMenu(!showMenu);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 2000);
    }
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  const shareToTumblr = () => {
    const url = `https://www.tumblr.com/widgets/share/tool?posttype=link&title=${encodeURIComponent(`${username}'s AO3 Wrapped`)}&caption=${encodeURIComponent(shareText)}&content=${encodeURIComponent(currentUrl)}&canonicalUrl=${encodeURIComponent(currentUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  const shareToBluesky = () => {
    const url = `https://bsky.app/intent/compose?text=${encodeURIComponent(`${shareText}\n${currentUrl}`)}`;
    window.open(url, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className="punk-outline px-3 py-2 text-xs uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-(--punk-cream)/10 transition-colors"
        title="Share this page"
      >
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">Share</span>
      </button>

      {showMenu && (
        <div className="absolute bottom-full mb-2 right-0 punk-panel p-2 min-w-[160px] space-y-1 z-50">
          <button
            onClick={copyToClipboard}
            className="w-full px-3 py-2 text-left text-sm uppercase tracking-wider flex items-center gap-2 hover:bg-(--punk-cream)/10 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-(--punk-cyan)" /> : <Link className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={shareToTwitter}
            className="w-full px-3 py-2 text-left text-sm uppercase tracking-wider hover:bg-(--punk-cream)/10 transition-colors"
          >
            Twitter / X
          </button>
          <button
            onClick={shareToBluesky}
            className="w-full px-3 py-2 text-left text-sm uppercase tracking-wider hover:bg-(--punk-cream)/10 transition-colors"
          >
            Bluesky
          </button>
          <button
            onClick={shareToTumblr}
            className="w-full px-3 py-2 text-left text-sm uppercase tracking-wider hover:bg-(--punk-cream)/10 transition-colors"
          >
            Tumblr
          </button>
        </div>
      )}
    </div>
  );
}

export function StatsSlide({
  stats,
  currentSlide,
  onNext,
  onPrevious,
  onRestart,
  isLoadingDetails,
}: StatsSlideProps) {
  const totalSlides = 8;
  const [[page, direction], setPage] = useState([currentSlide, 0]);

  useEffect(() => {
    setPage([currentSlide, currentSlide > page ? 1 : -1]);
  }, [currentSlide]);


  const paginate = (newDirection: number) => {
    if (newDirection > 0) onNext();
    else onPrevious();
  };
  const hasDetailedData = stats.topFandoms.length > 0;
  const words = stats.totalWordsRead || 0;
  const joinedRaw = (stats.user.joined || '').trim();
  const joinedValid = joinedRaw.length > 0;
  const joinedParts = joinedRaw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const joinedYearNum = joinedParts ? Number(joinedParts[1]) : null;
  const joinedMonthNum = joinedParts ? Number(joinedParts[2]) : null;
  const joinedDayNum = joinedParts ? Number(joinedParts[3]) : null;
  const joinedDateUtc = joinedParts
    ? new Date(Date.UTC(joinedYearNum!, joinedMonthNum! - 1, joinedDayNum!))
    : null;
  const now = new Date();
  const nowUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceJoined = joinedDateUtc
    ? Math.max(1, Math.floor((nowUtc.getTime() - joinedDateUtc.getTime()) / 86400000))
    : null;
  const avgBookmarksPerDay = daysSinceJoined
    ? stats.user.bookmarks / daysSinceJoined
    : null;
  const yearsSinceJoined = daysSinceJoined ? daysSinceJoined / 365.25 : null;
  const avgBookmarksPerWeek = avgBookmarksPerDay ? avgBookmarksPerDay * 7 : null;
  const avgBookmarksPerMonth = avgBookmarksPerDay ? avgBookmarksPerDay * 30.44 : null;
  const avgBookmarksPerYear = yearsSinceJoined ? stats.user.bookmarks / yearsSinceJoined : null;
  const avgDaysBetweenBookmarks = avgBookmarksPerDay ? (1 / avgBookmarksPerDay) : null;
  const formatRate = (perDay: number | null) => {
    if (!perDay) return '—';
    if (perDay >= 1) return `${perDay.toFixed(2)} / day`;
    const daysPer = Math.ceil(1 / perDay);
    return `1 / ${daysPer} days`;
  };
  const accountAgeLabel = (() => {
    if (!joinedParts) return '—';
    let years = now.getUTCFullYear() - joinedYearNum!;
    let months = now.getUTCMonth() - (joinedMonthNum! - 1);
    if (now.getUTCDate() < joinedDayNum!) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    const yearPart = years > 0 ? `${years}y` : '';
    const monthPart = months > 0 ? `${months}m` : '';
    return `${yearPart}${yearPart && monthPart ? ' ' : ''}${monthPart}` || '0m';
  })();
  const formatJoined = (raw: string) => {
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return raw;
    const [, year, month, day] = match;
    const monthIndex = Number(month) - 1;
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const monthLabel = monthNames[monthIndex] ?? month;
    return `${monthLabel} ${Number(day)}, ${year}`;
  };

  const getJoinedCalendar = (raw: string) => {
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return {
        year: '----',
        monthLabel: '---',
        days: Array.from({ length: 42 }, (_, i) => (i < 28 ? i + 1 : null)),
        highlight: null,
      };
    }

    const [, year, month, day] = match;
    const y = Number(year);
    const m = Number(month) - 1;
    const d = Number(day);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const days = Array.from({ length: 42 }, (_, idx) => {
      const dayNum = idx - firstDay + 1;
      return dayNum > 0 && dayNum <= daysInMonth ? dayNum : null;
    });

    return {
      year,
      monthLabel: monthNames[m],
      days,
      highlight: d,
    };
  };

  const renderSlideContent = () => {
    const slideIndex = page;
    switch (slideIndex) {
      // SLIDE 0: Welcome / Profile Identity
      case 0:
        return (
          <div className="h-full w-full flex items-center justify-center p-4 md:p-6">
            <div className="max-w-4xl w-full space-y-6">
              {/* Hero Identity */}
              <div className="text-center space-y-3">
                <div className="flex justify-center"><BookOpen className="w-12 h-12 text-(--punk-red)" /></div>
                <div className="punk-kicker text-xs">AO3 WRAPPED 2025</div>
                <h1 className="text-5xl md:text-6xl font-black uppercase leading-[0.9] text-(--punk-red)">
                  {stats.user.username}
                </h1>
                <div className="flex items-center justify-center gap-4">
                  <div className="punk-divider w-16"></div>
                  <p className="text-(--punk-cream)/80 text-lg uppercase tracking-[0.2em]">
                    Archive Profile
                  </p>
                  <div className="punk-divider w-16"></div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="punk-panel p-3 text-center space-y-1">
                  <div className="flex justify-center"><Calendar className="w-5 h-5 text-(--punk-yellow)" /></div>
                  <div className="text-[0.65rem] uppercase tracking-[0.2em] text-(--punk-yellow)">Joined</div>
                  <div className="text-lg font-black">
                    {joinedValid ? formatJoined(joinedRaw).split(',')[1]?.trim() || '—' : '—'}
                  </div>
                </div>
                <div className="punk-panel p-3 text-center space-y-1">
                  <div className="flex justify-center"><TrendingUp className="w-5 h-5 text-(--punk-cyan)" /></div>
                  <div className="text-[0.65rem] uppercase tracking-[0.2em] text-(--punk-yellow)">Active</div>
                  <div className="text-lg font-black text-(--punk-red)">{accountAgeLabel}</div>
                </div>
                <div className="punk-panel p-3 text-center space-y-1">
                  <div className="flex justify-center"><Bookmark className="w-5 h-5 text-(--punk-red)" /></div>
                  <div className="text-[0.65rem] uppercase tracking-[0.2em] text-(--punk-yellow)">Bookmarks</div>
                  <div className="text-lg font-black">{stats.user.bookmarks.toLocaleString()}</div>
                </div>
                <div className="punk-panel p-3 text-center space-y-1">
                  <div className="flex justify-center"><PenTool className="w-5 h-5 text-(--punk-magenta)" /></div>
                  <div className="text-[0.65rem] uppercase tracking-[0.2em] text-(--punk-yellow)">Works</div>
                  <div className="text-lg font-black">{stats.user.works}</div>
                </div>
              </div>

              {/* Reading Rate Highlight */}
              <div className="punk-panel p-4 text-center space-y-2">
                <div className="flex justify-center"><Flame className="w-8 h-8 text-(--punk-yellow)" /></div>
                <div className="text-xs uppercase tracking-[0.2em] text-(--punk-cream)/60">Bookmarking Pace</div>
                <div className="text-3xl font-black text-(--punk-red)">
                  {formatRate(avgBookmarksPerDay)}
                </div>
                <div className="text-xs uppercase tracking-widest text-(--punk-cream)/50">
                  {avgBookmarksPerDay && avgBookmarksPerDay >= 1 
                    ? `You bookmark ${avgBookmarksPerDay.toFixed(1)} works per day on average`
                    : avgDaysBetweenBookmarks 
                      ? `You bookmark 1 work every ${Math.ceil(avgDaysBetweenBookmarks)} days on average`
                      : ''}
                </div>
              </div>
            </div>
          </div>
        );

      // SLIDE 1: Reading Volume - LEFT/RIGHT Split with Animations
      case 1: {
        const rateData = {
          labels: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
          datasets: [{
            label: 'Rate',
            data: [
              avgBookmarksPerDay || 0,
              avgBookmarksPerWeek || 0,
              avgBookmarksPerMonth || 0,
              avgBookmarksPerYear || 0
            ],
            backgroundColor: [THEME.red, THEME.cyan, THEME.magenta, THEME.yellow],
            borderColor: THEME.cream,
            borderWidth: 2,
            borderRadius: 4,
          }]
        };

        return (
          <div className="h-full w-full flex items-center justify-center p-6 md:p-8">
            <div className="max-w-6xl w-full flex gap-8 items-stretch">
              {/* LEFT: The Big Number */}
              <motion.div 
                className="flex-1 punk-panel p-8 flex flex-col justify-center text-center"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <div className="punk-kicker text-sm mb-3">YOUR LIBRARY</div>
                <motion.div 
                  className="text-[8rem] md:text-[10rem] font-black leading-none text-(--punk-red) tracking-tighter"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  {stats.user.bookmarks.toLocaleString()}
                </motion.div>
                <div className="text-2xl uppercase tracking-[0.3em] text-(--punk-yellow) mt-3">
                  Total Bookmarks
                </div>
                <div className="punk-divider w-32 mx-auto my-6"></div>
                <div className="flex justify-center gap-10">
                  <motion.div 
                    className="text-center"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <div className="text-4xl font-black text-(--punk-cream)">{daysSinceJoined?.toLocaleString() || '—'}</div>
                    <div className="text-xs uppercase tracking-widest text-(--punk-cream)/50">Days Active</div>
                  </motion.div>
                  <motion.div 
                    className="text-center"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <div className="text-4xl font-black text-(--punk-cyan)">{accountAgeLabel}</div>
                    <div className="text-xs uppercase tracking-widest text-(--punk-cream)/50">Account Age</div>
                  </motion.div>
                </div>
              </motion.div>

              {/* RIGHT: Reading Rate Chart */}
              <motion.div 
                className="w-96 flex flex-col gap-5"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <div className="punk-panel p-5 flex-1">
                  <div className="text-sm uppercase tracking-widest text-(--punk-cream)/50 mb-3 text-center">Reading Rate</div>
                  <div className="h-60">
                    <Bar
                      data={rateData}
                      options={{
                        ...commonChartOptions,
                        indexAxis: 'y' as const,
                        plugins: { 
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.parsed.x.toFixed(2)} bookmarks`
                            }
                          }
                        },
                        scales: {
                          x: { grid: { color: THEME.grid }, ticks: { color: THEME.cream } },
                          y: { grid: { display: false }, ticks: { color: THEME.cream, font: { weight: 600 } } }
                        }
                      }}
                    />
                  </div>
                </div>
                <motion.div 
                  className="punk-panel p-5 text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <div className="text-5xl font-black text-(--punk-red)">{formatRate(avgBookmarksPerDay)}</div>
                  <div className="text-sm uppercase tracking-widest text-(--punk-cream)/50 mt-1">
                    {avgBookmarksPerDay && avgBookmarksPerDay >= 1 
                      ? 'bookmarks per day'
                      : 'days between bookmarks'}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        );
      }

      // SLIDE 2: Word Count - Visual Comparison Bars
      case 2: {
        if (!hasDetailedData && isLoadingDetails) return <PunkLoader label="Calculating words" />;

        const wordsInMillions = (words / 1000000).toFixed(2);
        const booksEquivalent = Math.floor(words / 80000);
        const hoursReading = Math.floor(words / 250 / 60);
        const daysReading = Math.floor(hoursReading / 24);
        const avgPerWork = stats.user.bookmarks ? Math.floor(words / stats.user.bookmarks) : 0;

        // Comparison data for horizontal bars
        const comparisons = [
          { label: 'The Hobbit', words: 95000, color: THEME.cyan },
          { label: 'Hunger Games', words: 99750, color: THEME.yellow },
          { label: 'Harry Potter 1-7', words: 1084170, color: THEME.magenta },
          { label: 'War & Peace', words: 587000, color: THEME.cream },
          { label: 'YOUR LIBRARY', words: words, color: THEME.red },
        ].sort((a, b) => b.words - a.words);
        const maxWords = Math.max(...comparisons.map(c => c.words));

        return (
          <div className="h-full w-full flex items-center justify-center p-6 md:p-8">
            <div className="max-w-6xl w-full">
              {/* Title */}
              <motion.div 
                className="text-center mb-8"
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <div className="punk-kicker text-sm">READING JOURNEY</div>
                <h2 className="text-4xl font-black uppercase text-(--punk-cream)">Words Consumed</h2>
              </motion.div>

              <div className="flex gap-8">
                {/* LEFT: Big Number + Stats */}
                <motion.div 
                  className="w-72 flex flex-col gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <div className="punk-panel p-6 text-center">
                    <div className="text-6xl font-black leading-none text-(--punk-magenta)">
                      {wordsInMillions}M
                    </div>
                    <div className="text-sm uppercase tracking-widest text-(--punk-yellow) mt-2">Total Words</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="punk-panel p-3 text-center">
                      <div className="text-2xl font-black text-(--punk-cyan)">{booksEquivalent}</div>
                      <div className="text-xs uppercase tracking-wider text-(--punk-cream)/50">Novels</div>
                    </div>
                    <div className="punk-panel p-3 text-center">
                      <div className="text-2xl font-black text-(--punk-red)">{hoursReading > 999 ? `${(hoursReading/1000).toFixed(1)}K` : hoursReading}</div>
                      <div className="text-xs uppercase tracking-wider text-(--punk-cream)/50">Hours</div>
                    </div>
                    <div className="punk-panel p-3 text-center">
                      <div className="text-2xl font-black text-(--punk-yellow)">{daysReading}</div>
                      <div className="text-xs uppercase tracking-wider text-(--punk-cream)/50">Days</div>
                    </div>
                    <div className="punk-panel p-3 text-center">
                      <div className="text-2xl font-black text-(--punk-magenta)">{Math.floor(avgPerWork/1000)}K</div>
                      <div className="text-xs uppercase tracking-wider text-(--punk-cream)/50">Avg/Work</div>
                    </div>
                  </div>
                </motion.div>

                {/* RIGHT: Visual Comparison Bars */}
                <motion.div 
                  className="flex-1 punk-panel p-6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <div className="text-sm uppercase tracking-widest text-(--punk-cream)/50 mb-5">How You Compare</div>
                  <div className="space-y-4">
                    {comparisons.map((item, i) => {
                      const width = (item.words / maxWords) * 100;
                      const isYou = item.label === 'YOUR LIBRARY';
                      return (
                        <motion.div 
                          key={item.label} 
                          className={isYou ? 'pt-3 border-t border-(--punk-cream)/20' : ''}
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15, delay: 0.35 + i * 0.05, ease: [0.34, 1.56, 0.64, 1] }}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-base font-bold ${isYou ? 'text-(--punk-red)' : 'text-(--punk-cream)/80'}`}>
                              {item.label}
                            </span>
                            <span className="text-base font-black" style={{ color: item.color }}>
                              {(item.words / 1000000).toFixed(2)}M
                            </span>
                          </div>
                          <div className="h-7 bg-(--punk-cream)/10 rounded overflow-hidden">
                            <motion.div 
                              className="h-full rounded flex items-center justify-end pr-3"
                              style={{ backgroundColor: item.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${width}%` }}
                              transition={{ duration: 0.25, delay: 0.4 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                            >
                              {isYou && <span className="text-xs font-black text-(--punk-black)">YOU</span>}
                            </motion.div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        );
      }

      // SLIDE 3: Top Fandoms - Doughnut + Animated List
      case 3: {
        if (!hasDetailedData && isLoadingDetails) return <PunkLoader label="Analyzing fandoms" />;

        const topFandoms = stats.topFandoms.slice(0, 7);
        const topFandom = topFandoms[0];
        const maxCount = topFandom?.count || 1;
        
        // Unique colors for each fandom
        const fandomColors = [
          '#c9142f', // red
          '#2de2e6', // cyan
          '#f5c518', // yellow
          '#ff2e88', // magenta
          '#9b5de5', // purple
          '#00f5d4', // teal
          '#ff6b35', // orange
        ];

        // Doughnut data
        const doughnutData = {
          labels: topFandoms.map(f => f.name.length > 20 ? f.name.slice(0,20)+'...' : f.name),
          datasets: [{
            data: topFandoms.map(f => f.count),
            backgroundColor: fandomColors.slice(0, topFandoms.length),
            borderColor: THEME.charcoal,
            borderWidth: 2,
          }]
        };

        return (
          <div className="h-full w-full flex items-center justify-center p-6">
            <div className="w-full max-w-7xl">
              {/* Header */}
              <motion.div 
                className="text-center mb-10"
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <div className="punk-kicker text-sm">YOUR UNIVERSES</div>
                <h2 className="text-4xl font-black uppercase text-(--punk-cream)">Top Fandoms</h2>
              </motion.div>

              <div className="flex gap-6 items-center">
                {/* LEFT: Doughnut Chart - Half page, NO box */}
                <motion.div 
                  className="w-1/2 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <div className="w-[500px] h-[500px]">
                    <Doughnut
                      data={doughnutData}
                      options={{
                        ...commonChartOptions,
                        cutout: '50%',
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.parsed} works`
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </motion.div>

                {/* RIGHT: Compact Bar List */}
                <div className="w-1/2 space-y-2">
                  {topFandoms.map((fandom, idx) => {
                    const width = (fandom.count / maxCount) * 100;
                    const isFirst = idx === 0;
                    const color = fandomColors[idx];
                    return (
                      <motion.div 
                        key={fandom.name} 
                        className="punk-panel p-3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15, delay: 0.3 + idx * 0.04, ease: [0.34, 1.56, 0.64, 1] }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: color }}
                          />
                          <div className={`w-8 text-center font-black ${isFirst ? 'text-xl' : 'text-lg text-(--punk-cream)/40'}`} style={{ color: isFirst ? color : undefined }}>
                            #{idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-3 mb-1">
                              <span className={`font-bold truncate ${isFirst ? 'text-lg' : 'text-base'}`} style={{ color: isFirst ? color : undefined }} title={fandom.name}>
                                {fandom.name.length > 40 ? `${fandom.name.slice(0, 40)}...` : fandom.name}
                              </span>
                              <span className="font-black text-lg flex-shrink-0" style={{ color }}>
                                {fandom.count}
                              </span>
                            </div>
                            <div className="h-2 bg-(--punk-cream)/10 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full rounded-full"
                                style={{ backgroundColor: color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${width}%` }}
                                transition={{ duration: 0.25, delay: 0.35 + idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // SLIDE 4: Top Relationships - Redesigned Ship Map
      case 4: {
        if (!hasDetailedData && isLoadingDetails) return <PunkLoader label="Loading ships" />;

        const topShips = (stats.topRelationships ?? []).slice(0, 8);
        
        // Unique colors for each ship
        const shipColors = [
          '#ff2e88', // magenta
          '#2de2e6', // cyan
          '#f5c518', // yellow
          '#c9142f', // red
          '#9b5de5', // purple
          '#00f5d4', // teal
          '#ff6b35', // orange
          '#f8f5e8', // cream
        ];

        // Build character nodes with SHUFFLED positions to avoid adjacent connections
        const characterMap = new Map<string, { name: string; totalCount: number; shipIndices: number[] }>();
        const edges: { from: string; to: string; weight: number; shipIdx: number }[] = [];

        topShips.forEach((ship, shipIdx) => {
          const chars = ship.name.split('/').map(c => c.trim());
          chars.forEach(char => {
            if (!characterMap.has(char)) {
              characterMap.set(char, { name: char, totalCount: 0, shipIndices: [] });
            }
            const node = characterMap.get(char)!;
            node.totalCount += ship.count;
            node.shipIndices.push(shipIdx);
          });
          if (chars.length === 2) {
            edges.push({ from: chars[0], to: chars[1], weight: ship.count, shipIdx });
          }
        });

        // Sort by count and assign positions in a way that spreads connected nodes apart
        const sortedChars = Array.from(characterMap.values()).sort((a, b) => b.totalCount - a.totalCount);
        const nodeCount = sortedChars.length;
        
        // Shuffle positions: place every other node on opposite sides
        const shuffleOrder = sortedChars.map((_, i) => {
          if (i % 2 === 0) return Math.floor(i / 2);
          return nodeCount - 1 - Math.floor(i / 2);
        });

        const centerX = 260;
        const centerY = 240;
        const radius = 200;

        const positionedNodes = sortedChars.map((node, originalIdx) => {
          const posIdx = shuffleOrder[originalIdx];
          const angle = (posIdx * 2 * Math.PI) / nodeCount - Math.PI / 2;
          return {
            ...node,
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
          };
        });

        const maxCount = Math.max(...positionedNodes.map(n => n.totalCount), 1);
        const maxEdgeWeight = Math.max(...edges.map(e => e.weight), 1);

        return (
          <div className="h-full w-full flex items-center justify-center p-6">
            <div className="w-full max-w-7xl">
              {/* Header */}
              <motion.div 
                className="text-center mb-10"
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <div className="punk-kicker text-sm">RELATIONSHIP WEB</div>
                <h2 className="text-4xl font-black uppercase text-(--punk-magenta)">Your Ships</h2>
              </motion.div>

              <div className="flex gap-6 items-center">
                {/* LEFT: Network Map - Half page, NO box */}
                <motion.div 
                  className="w-1/2 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <svg viewBox="0 0 520 480" className="w-[520px] h-[480px]">
                    {/* Edges */}
                    {edges.map((edge, idx) => {
                      const fromNode = positionedNodes.find(n => n.name === edge.from);
                      const toNode = positionedNodes.find(n => n.name === edge.to);
                      if (!fromNode || !toNode) return null;
                      const thickness = 2 + (edge.weight / maxEdgeWeight) * 4;
                      const opacity = 0.5 + (edge.weight / maxEdgeWeight) * 0.4;
                      return (
                        <line
                          key={`e-${idx}`}
                          x1={fromNode.x}
                          y1={fromNode.y}
                          x2={toNode.x}
                          y2={toNode.y}
                          stroke={shipColors[edge.shipIdx]}
                          strokeWidth={thickness}
                          opacity={opacity}
                        />
                      );
                    })}
                    {/* Nodes */}
                    {positionedNodes.map((node, idx) => {
                      const size = 22 + (node.totalCount / maxCount) * 18;
                      const color = shipColors[idx % shipColors.length];
                      return (
                        <g key={`n-${idx}`}>
                          <circle cx={node.x} cy={node.y} r={size} fill={color} stroke={THEME.cream} strokeWidth={3} />
                          <text x={node.x} y={node.y + 6} textAnchor="middle" fill={THEME.charcoal} fontSize="16" fontWeight="900">
                            {node.totalCount}
                          </text>
                          <text x={node.x} y={node.y - size - 10} textAnchor="middle" fill={THEME.cream} fontSize="14" fontWeight="700">
                            {node.name.length > 12 ? node.name.slice(0,12)+'...' : node.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </motion.div>

                {/* RIGHT: Ship Rankings - Compact */}
                <div className="w-1/2 space-y-2">
                  {topShips.map((ship, idx) => {
                    const color = shipColors[idx];
                    return (
                      <motion.div 
                        key={ship.name}
                        className="punk-panel p-3 flex items-center gap-3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15, delay: 0.3 + idx * 0.04, ease: [0.34, 1.56, 0.64, 1] }}
                      >
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: color }}
                        />
                        <div className="w-7 text-center text-lg font-black text-(--punk-cream)/40">#{idx+1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-base truncate" style={{ color }} title={ship.name}>
                            {ship.name.split('/').join(' × ')}
                          </div>
                        </div>
                        <div className="text-xl font-black flex-shrink-0" style={{ color }}>{ship.count}</div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // SLIDE 5: Top Characters - Podium + Bar Chart (with fallback)
      case 5: {
        if (!hasDetailedData && isLoadingDetails) return <PunkLoader label="Finding characters" />;

        const topChars = (stats.topCharacters ?? []).slice(0, 10);
        const colors = [THEME.yellow, THEME.cream, THEME.red, THEME.cyan, THEME.magenta, THEME.yellow, THEME.cream];

        // If no character data, show a message
        if (topChars.length === 0) {
          return (
            <div className="h-full w-full flex items-center justify-center p-4 md:p-6">
              <div className="max-w-lg text-center space-y-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <Star className="w-16 h-16 text-(--punk-yellow) mx-auto mb-4" />
                  <div className="punk-kicker text-xs">CHARACTER DATA</div>
                  <h2 className="text-3xl font-black uppercase text-(--punk-cream)">No Character Tags Found</h2>
                  <p className="text-(--punk-cream)/60 text-sm mt-4">
                    Your bookmarks don't have character tags we could analyze, or the data is still loading.
                  </p>
                </motion.div>
              </div>
            </div>
          );
        }

        const top3 = topChars.slice(0, 3);
        const rest = topChars.slice(3);
        const maxCount = topChars[0]?.count || 1;

        return (
          <div className="h-full w-full flex items-center justify-center p-6 md:p-8">
            <div className="max-w-5xl w-full">
              {/* Header */}
              <motion.div 
                className="text-center mb-6"
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <div className="punk-kicker text-sm">CHARACTER FOCUS</div>
                <h2 className="text-4xl font-black uppercase text-(--punk-cream)">Your Favorites</h2>
              </motion.div>

              {/* Podium - Top 3 */}
              <div className="flex justify-center items-end gap-4 mb-6">
                {/* 2nd Place */}
                {top3[1] && (
                  <motion.div 
                    className="punk-panel p-4 text-center w-44"
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <div className="text-3xl font-black text-(--punk-cream)/40">#2</div>
                    <div className="text-lg font-bold truncate text-(--punk-cream)" title={top3[1].name}>
                      {top3[1].name.length > 12 ? `${top3[1].name.slice(0,12)}...` : top3[1].name}
                    </div>
                    <div className="text-3xl font-black text-(--punk-cream)">{top3[1].count}</div>
                    <div className="h-16 bg-(--punk-cream)/20 mt-3 rounded"></div>
                  </motion.div>
                )}
                {/* 1st Place */}
                {top3[0] && (
                  <motion.div 
                    className="punk-panel p-5 text-center w-52 border-2 border-(--punk-yellow)"
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <div className="text-4xl font-black text-(--punk-yellow)">#1</div>
                    <div className="text-xl font-bold truncate text-(--punk-yellow)" title={top3[0].name}>
                      {top3[0].name.length > 12 ? `${top3[0].name.slice(0,12)}...` : top3[0].name}
                    </div>
                    <div className="text-5xl font-black text-(--punk-yellow)">{top3[0].count}</div>
                    <div className="h-24 bg-(--punk-yellow)/30 mt-3 rounded"></div>
                  </motion.div>
                )}
                {/* 3rd Place */}
                {top3[2] && (
                  <motion.div 
                    className="punk-panel p-4 text-center w-44"
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.34, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <div className="text-3xl font-black text-(--punk-red)/60">#3</div>
                    <div className="text-lg font-bold truncate text-(--punk-red)" title={top3[2].name}>
                      {top3[2].name.length > 12 ? `${top3[2].name.slice(0,12)}...` : top3[2].name}
                    </div>
                    <div className="text-3xl font-black text-(--punk-red)">{top3[2].count}</div>
                    <div className="h-10 bg-(--punk-red)/20 mt-3 rounded"></div>
                  </motion.div>
                )}
              </div>

              {/* Rest as animated horizontal bars */}
              {rest.length > 0 && (
                <motion.div 
                  className="punk-panel p-5"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <div className="space-y-3">
                    {rest.map((char, idx) => {
                      const width = (char.count / maxCount) * 100;
                      return (
                        <motion.div 
                          key={char.name} 
                          className="flex items-center gap-4"
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15, delay: 0.48 + idx * 0.05, ease: [0.34, 1.56, 0.64, 1] }}
                        >
                          <div className="w-8 text-base font-black text-(--punk-cream)/40">#{idx + 4}</div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-base font-bold truncate max-w-[60%]">{char.name}</span>
                              <span className="text-lg font-black" style={{ color: colors[idx % colors.length] }}>{char.count}</span>
                            </div>
                            <div className="h-3 bg-(--punk-cream)/10 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full rounded-full"
                                style={{ backgroundColor: colors[idx % colors.length] }}
                                initial={{ width: 0 }}
                                animate={{ width: `${width}%` }}
                                transition={{ duration: 0.25, delay: 0.52 + idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        );
      }

      // SLIDE 6: Creative Output - What You Made
      case 6: {
        const hasCreated = stats.user.works > 0 || stats.user.series > 0 || stats.user.gifts > 0;
        const creatorReaderRatio = stats.user.bookmarks > 0 
          ? ((stats.user.works / stats.user.bookmarks) * 100).toFixed(1)
          : '0';

        // Doughnut chart for creator vs reader
        const ratioChartData = {
          labels: ['Created', 'Bookmarked'],
          datasets: [{
            data: [stats.user.works, stats.user.bookmarks],
            backgroundColor: [THEME.red, THEME.cyan],
            borderColor: THEME.charcoal,
            borderWidth: 3,
          }]
        };

        return (
          <div className="h-full w-full flex items-center justify-center p-6 md:p-8">
            <div className="max-w-5xl w-full space-y-6">
              <div className="text-center space-y-3">
                <div className="flex justify-center"><PenTool className="w-14 h-14 text-(--punk-red)" /></div>
                <div className="punk-kicker text-sm">YOUR CREATIONS</div>
                <h2 className="text-4xl font-black uppercase">What You Made</h2>
              </div>

              {hasCreated ? (
                <>
                  {/* Main stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="punk-panel p-6 text-center space-y-3">
                      <div className="flex justify-center"><PenTool className="w-8 h-8 text-(--punk-red)" /></div>
                      <div className="text-sm uppercase tracking-[0.2em] text-(--punk-yellow)">
                        Works
                      </div>
                      <div className="text-5xl font-black text-(--punk-red)">
                        {stats.user.works}
                      </div>
                    </div>
                    <div className="punk-panel p-6 text-center space-y-3">
                      <div className="flex justify-center"><BookOpen className="w-8 h-8 text-(--punk-cyan)" /></div>
                      <div className="text-sm uppercase tracking-[0.2em] text-(--punk-yellow)">
                        Series
                      </div>
                      <div className="text-5xl font-black text-(--punk-cyan)">
                        {stats.user.series}
                      </div>
                    </div>
                    <div className="punk-panel p-6 text-center space-y-3">
                      <div className="flex justify-center"><Heart className="w-8 h-8 text-(--punk-magenta) fill-current" /></div>
                      <div className="text-sm uppercase tracking-[0.2em] text-(--punk-yellow)">
                        Gifts
                      </div>
                      <div className="text-5xl font-black text-(--punk-magenta)">
                        {stats.user.gifts}
                      </div>
                    </div>
                  </div>

                  {/* Creator/Reader chart and insight */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="punk-panel p-5 h-64">
                      <Doughnut
                        data={ratioChartData}
                        options={{
                          ...commonChartOptions,
                          cutout: '65%',
                          plugins: {
                            legend: {
                              display: true,
                              position: 'bottom',
                              labels: {
                                color: THEME.cream,
                                font: { size: 14, weight: 600 },
                                padding: 18
                              }
                            }
                          }
                        }}
                      />
                    </div>
                    <div className="punk-outline p-5 flex flex-col items-center justify-center space-y-3">
                      <div className="flex justify-center"><Users className="w-10 h-10 text-(--punk-yellow)" /></div>
                      <div className="text-sm uppercase tracking-widest text-(--punk-cream)/60">
                        Reader to Creator Ratio
                      </div>
                      <div className="text-6xl font-black text-(--punk-yellow)">
                        1:{Math.round(100 / creatorReaderRatio) || '∞'}
                      </div>
                      <div className="text-sm uppercase tracking-wider text-(--punk-cream)/50">
                        You create 1 work for every {Math.round(100 / creatorReaderRatio) || '—'} bookmarks
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="punk-panel p-10 text-center space-y-5">
                  <div className="flex justify-center"><BookOpen className="w-20 h-20 text-(--punk-cyan)" /></div>
                  <h3 className="text-4xl font-black uppercase text-(--punk-cream)/70">
                    Pure Reader
                  </h3>
                  <p className="text-lg text-(--punk-cream)/60">
                    You haven't published works yet, but your reading journey is just as valuable
                  </p>
                  <div className="punk-divider w-32 mx-auto"></div>
                  <div className="text-base uppercase tracking-widest text-(--punk-cream)/50">
                    {stats.user.bookmarks} works saved and cherished
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      // SLIDE 7: Year Wrapped Summary - Minimal
      case 7:
        return (
          <div className="h-full w-full flex items-center justify-center p-6">
            <div className="text-center">
              {/* Year title */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
                className="mb-6"
              >
                <div className="text-2xl uppercase tracking-[0.5em] text-(--punk-cream)/50 mb-2">
                  Your
                </div>
                <div className="text-[10rem] font-black leading-none text-(--punk-red) -my-4">
                  2025
                </div>
                <div className="text-4xl font-black uppercase tracking-[0.3em] text-(--punk-cream) mt-2">
                  Wrapped
                </div>
              </motion.div>

              {/* Divider */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.2, delay: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <div className="punk-divider w-64 mx-auto my-8"></div>
              </motion.div>

              {/* Username */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
                className="mb-8"
              >
                <div className="text-6xl font-black text-(--punk-cyan) mb-3">
                  {stats.user.username}
                </div>
                <div className="text-xl uppercase tracking-[0.2em] text-(--punk-cream)/60">
                  <span className="text-(--punk-red)">{stats.user.bookmarks.toLocaleString()}</span> bookmarks
                  <span className="mx-3 text-(--punk-cream)/30">•</span>
                  <span className="text-(--punk-magenta)">{(words / 1000000).toFixed(1)}M</span> words read
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <button
                  onClick={onRestart}
                  className="punk-outline px-14 py-5 bg-(--punk-red) text-xl font-black uppercase tracking-[0.2em] hover:bg-(--punk-cream) hover:text-(--punk-black) transition-colors"
                >
                  View Again
                </button>
              </motion.div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen w-screen punk-bg punk-grid punk-scanlines punk-noise flex flex-col overflow-hidden">
      <div className="h-2 w-full bg-(--punk-black)">
        <motion.div
          className="h-full bg-(--punk-red)"
          initial={{ width: 0 }}
          animate={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: 'spring', stiffness: 450, damping: 32 }, opacity: { duration: 0.08 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(_, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);
              if (swipe < -swipeConfidenceThreshold) paginate(1);
              else if (swipe > swipeConfidenceThreshold) paginate(-1);
            }}
            className="absolute w-full h-full"
          >
            {renderSlideContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="h-20 border-t-2 border-(--punk-cream) flex items-center justify-between px-8 bg-(--punk-black)">
        <button
          onClick={onPrevious}
          disabled={currentSlide === 0}
          className="punk-outline px-4 py-2 text-xs uppercase tracking-[0.3em] disabled:opacity-40"
        >
          Prev
        </button>

        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-6 ${i === currentSlide ? 'bg-(--punk-red)' : 'bg-(--punk-cream)/20'}`}
              ></div>
            ))}
          </div>
          
          <ShareButton username={stats.user.username} />
        </div>

        {currentSlide === totalSlides - 1 ? (
          <button
            onClick={onRestart}
            className="punk-outline px-4 py-2 text-xs uppercase tracking-[0.3em] bg-(--punk-cream) text-(--punk-black)"
          >
            Restart
          </button>
        ) : (
          <button
            onClick={onNext}
            className="punk-outline px-5 py-2 text-xs uppercase tracking-[0.3em] bg-(--punk-red)"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
