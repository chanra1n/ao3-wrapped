// Types matching @fujocoded/ao3.js library responses
export interface AO3UserProfile {
  username: string;
  url: string;
  icon: string;
  header: string;
  joined: string;
  bio: string | null;
  bioHtml: string | null;
  works: number;
  series: number;
  bookmarks: number;
  collections: number;
  gifts: number;
  // Stats
  topFandoms?: { name: string; count: number }[];
  topCharacters?: { name: string; count: number }[];
  topRelationships?: { name: string; count: number }[];
  totalWordsRead?: number;
}

export interface AO3Work {
  id: string;
  title: string;
  authors: Array<{ username: string; pseud: string }>;
  fandoms: string[];
  rating: string;
  warnings: string[];
  categories: string[];
  relationships: string[];
  characters: string[];
  tags: string[];
  language: string;
  series: Array<{ id: string; name: string; part: number }>;
  stats: {
    words: number;
    chapters: { published: number; total: number | null };
    kudos: number;
    bookmarks: number;
    hits: number;
    comments: number;
  };
  summary: string;
  summaryHtml: string;
  publishedAt: string;
  updatedAt: string;
  isComplete: boolean;
}

// Derived stats for our wrapped presentation
export interface FandomStat {
  name: string;
  count: number;
  percentage: number;
}

export interface AuthorStat {
  name: string;
  worksCount: number;
}

export interface UserStats {
  user: AO3UserProfile;
  recentWorks: AO3Work[];
  topFandoms: FandomStat[];
  topAuthors: AuthorStat[];
  topRelationships?: { name: string; count: number }[];
  topCharacters?: { name: string; count: number }[];
  totalWorksRead: number;
  totalWordsRead: number;
}

export type SlideType = 
  | 'welcome'
  | 'fandoms'
  | 'authors'
  | 'works'
  | 'stats'
  | 'summary';
