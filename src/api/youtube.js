import {
  buildFocusedSearchQuery,
  filterFocusedResults,
} from './searchShared.js';
import { fetchInvidiousResults } from './searchBackend.js';
import { fetchProxyResults } from './proxySearch.js';

// Search order: Broadcast's built-in keyless proxy (see worker/README.md),
// then the public Invidious pool as a safety net. Users configure nothing.
export async function searchYouTube(query, options = {}) {
  const focused = options.focused ?? true;
  const searchQuery = buildFocusedSearchQuery(query, focused);

  let videos = await fetchProxyResults(searchQuery, {
    logger: console,
    ...options,
  });

  if (videos.length === 0) {
    videos = await fetchInvidiousResults(searchQuery, { logger: console });
  }

  videos = filterFocusedResults(query, videos, focused);
  return videos.length > 0 ? videos : null;
}
