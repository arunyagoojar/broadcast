import {
  buildFocusedSearchQuery,
  filterFocusedResults,
  normalizeInvidiousResults,
} from './searchShared';
import { fetchInvidiousResults } from './searchBackend';

export async function searchYouTube(query, options = {}) {
  const focused = options.focused ?? true;
  const searchQuery = buildFocusedSearchQuery(query, focused);

  try {
    const r = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
    if (r.ok) {
      const data = await r.json();
      const results = filterFocusedResults(
        query,
        normalizeInvidiousResults(data),
        focused
      );
      if (results.length > 0) return results;
    }
  } catch (e) {
    console.error('[TV] Proxy search failed:', e);
  }

  // Client-side fallback: directly querying known CORS-enabled public Invidious instances
  console.warn('[TV] Proxy search failed or returned empty. Trying direct client-side fallback...');
  const fallbackResults = filterFocusedResults(
    query,
    await fetchInvidiousResults(searchQuery, { logger: console }),
    focused
  );
  if (fallbackResults.length > 0) return fallbackResults;

  return null;
}
