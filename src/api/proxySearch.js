import { createResultCache } from './searchShared.js';

// Search runs through Broadcast's own keyless Cloudflare Worker (worker/),
// so the app works with zero configuration. Set window.BROADCAST_PROXY_URL
// before the app loads to point at a different proxy; anything else falls
// back to the public Invidious pool.
const DEFAULT_PROXY_URL = 'https://broadcast-search.arunyagoojar.workers.dev';

const RESULT_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHED_QUERIES = 30;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const resultCache = createResultCache(RESULT_CACHE_TTL_MS, MAX_CACHED_QUERIES);

export function getProxyUrl() {
  const override =
    typeof window !== 'undefined' ? window.BROADCAST_PROXY_URL : '';
  return String(override || DEFAULT_PROXY_URL).trim().replace(/\/+$/, '');
}

export async function fetchProxyResults(query, options = {}) {
  const cleanQuery = String(query || '').trim().replace(/\s+/g, ' ');
  if (!cleanQuery) return [];

  const cached = resultCache.get(cleanQuery);
  if (cached) return cached;

  const base = options.proxyUrl ?? getProxyUrl();
  if (!base) return [];

  const timeoutMs = options.timeoutMs ?? 8000;
  const logger = options.logger || console;

  const url = new URL(`${base}/search`);
  url.searchParams.set('q', cleanQuery);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      throw new Error(`proxy returned ${response.status}`);
    }

    const data = await response.json();
    const videos = (Array.isArray(data) ? data : data?.videos || [])
      .map((v) => ({
        id: v.id || v.videoId,
        title: v.title || '',
        dur: Number(v.dur || v.lengthSeconds || 0),
      }))
      .filter((v) => v.id && VIDEO_ID_PATTERN.test(v.id))
      .slice(0, 30);

    if (!videos.length) throw new Error('proxy returned no usable videos');

    resultCache.set(cleanQuery, videos);
    return videos;
  } catch (error) {
    logger.warn?.('[Search] Proxy failed:', error.message);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
