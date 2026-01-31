import type { UserStats, AO3UserProfile } from '../types/ao3';

const API_BASE = 'http://localhost:3001/api';

// Fetch quick stats (instant - just dashboard counts)
async function fetchQuickProfile(username: string): Promise<AO3UserProfile> {
  const response = await fetch(`${API_BASE}/user/${encodeURIComponent(username)}/quick`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.details || `Failed to fetch user: ${response.statusText}`);
  }
  return response.json();
}

// Fetch full details (may take a while - scrapes all bookmarks)
async function fetchFullProfile(username: string): Promise<AO3UserProfile> {
  const response = await fetch(`${API_BASE}/user/${encodeURIComponent(username)}/details`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.details || `Failed to fetch details: ${response.statusText}`);
  }
  return response.json();
}

// Convert profile to stats format
function profileToStats(user: AO3UserProfile): UserStats {
  const totalFandomHits = user.topFandoms?.reduce((acc, f) => acc + f.count, 0) || 1;

  return {
    user,
    recentWorks: [],
    topFandoms: (user.topFandoms || []).map(f => ({
      name: f.name,
      count: f.count,
      percentage: Math.round((f.count / totalFandomHits) * 100)
    })),
    topAuthors: [],
    topRelationships: user.topRelationships || [],
    topCharacters: user.topCharacters || [],
    totalWorksRead: user.bookmarks,
    totalWordsRead: user.totalWordsRead || 0,
  };
}

// Quick fetch - returns immediately with basic stats
export async function fetchUserStatsQuick(username: string): Promise<UserStats> {
  const user = await fetchQuickProfile(username);
  return profileToStats(user);
}

// Full fetch - waits for complete data
export async function fetchUserStatsDetails(username: string): Promise<UserStats> {
  const user = await fetchFullProfile(username);
  return profileToStats(user);
}

// Legacy function for backwards compatibility
export async function fetchUserStats(username: string): Promise<UserStats> {
  return fetchUserStatsQuick(username);
}

export async function validateUsername(username: string): Promise<boolean> {
  if (username.length < 1 || username.length > 40) {
    return false;
  }
  
  try {
    await fetchQuickProfile(username);
    return true;
  } catch {
    return false;
  }
}
