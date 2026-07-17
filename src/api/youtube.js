import {
  buildFocusedSearchQuery,
  filterFocusedResults,
} from './searchShared';
import { fetchInvidiousResults } from './searchBackend';

export async function searchYouTube(query, options = {}) {
  const focused = options.focused ?? true;
  const searchQuery = buildFocusedSearchQuery(query, focused);

  const results = filterFocusedResults(
    query,
    await fetchInvidiousResults(searchQuery, { logger: console }),
    focused
  );

  return results.length > 0 ? results : null;
}
