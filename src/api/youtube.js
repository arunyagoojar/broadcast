import {
  buildFocusedSearchQuery,
  filterFocusedResults,
} from './searchShared.js';
import { fetchInvidiousResults } from './searchBackend.js';
import { fetchProxyResults, getProxyUrl } from './proxySearch.js';

// Search order: your own keyless proxy (see worker/README.md) when one is
// configured, then the public Invidious pool. Public instances rot as
// YouTube blocks them, so the proxy is the reliable path.
export async function searchYouTube(query, options = {}) {
  const focused = options.focused ?? true;
  const searchQuery = buildFocusedSearchQuery(query, focused);

  let videos = null;
  if (getProxyUrl() || options.proxyUrl) {
    const proxied = await fetchProxyResults(searchQuery, {
      logger: console,
      ...options,
    });
    if (proxied.length > 0) videos = proxied;
  }

  if (!videos) {
    videos = filterFocusedResults(
      query,
      await fetchInvidiousResults(searchQuery, { logger: console }),
      focused
    );
  } else {
    videos = filterFocusedResults(query, videos, focused);
  }

  return videos.length > 0 ? videos : null;
}
