import { normalizeInvidiousResults } from './searchShared.js';

// These instances are intentionally kept client-side so the deployed app remains
// completely static. They must return Access-Control-Allow-Origin for browser use.
const PRIMARY_INSTANCES = [
  'https://yt.chocolatemoo53.com',
  'https://invidious.flokinet.to',
];

const BACKUP_INSTANCES = [
  'https://inv.zoomerville.com',
  'https://iv.melmac.space',
  'https://yewtu.be',
  'https://invidious.private.coffee',
];

const RESULT_CACHE_TTL_MS = 10 * 60 * 1000;
const FAILED_INSTANCE_TTL_MS = 2 * 60 * 1000;
const MAX_CACHED_QUERIES = 30;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const resultCache = new Map();
const failedUntil = new Map();
let lastSuccessfulInstance = null;

function unique(values) {
  return [...new Set(values)];
}

function orderedInstances(instances) {
  const available = unique(instances).filter(
    (base) => (failedUntil.get(base) || 0) <= Date.now()
  );

  if (!lastSuccessfulInstance || !available.includes(lastSuccessfulInstance)) {
    return available;
  }

  return [
    lastSuccessfulInstance,
    ...available.filter((base) => base !== lastSuccessfulInstance),
  ];
}

function getCached(query) {
  const cached = resultCache.get(query);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > RESULT_CACHE_TTL_MS) {
    resultCache.delete(query);
    return null;
  }
  return cached.results;
}

function setCached(query, results) {
  resultCache.delete(query);
  resultCache.set(query, { createdAt: Date.now(), results });
  if (resultCache.size > MAX_CACHED_QUERIES) {
    resultCache.delete(resultCache.keys().next().value);
  }
}

async function fetchInstance(base, query, signal) {
  const url = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
  const response = await fetch(url, { signal });
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok || !contentType.includes('application/json')) {
    throw new Error(`${base} returned ${response.status}`);
  }

  const videos = normalizeInvidiousResults(await response.json())
    .filter((video) => VIDEO_ID_PATTERN.test(video.id))
    .slice(0, 30);

  if (!videos.length) throw new Error(`${base} returned no usable videos`);
  return { base, videos };
}

async function raceInstances(instances, query, timeoutMs) {
  const candidates = orderedInstances(instances);
  if (!candidates.length) return null;

  let settled = false;
  const requests = candidates.map((base) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const promise = fetchInstance(base, query, controller.signal)
      .catch((error) => {
        if (!settled) failedUntil.set(base, Date.now() + FAILED_INSTANCE_TTL_MS);
        throw error;
      })
      .finally(() => clearTimeout(timeout));

    return { controller, promise };
  });

  try {
    const winner = await Promise.any(requests.map(({ promise }) => promise));
    settled = true;
    requests.forEach(({ controller }) => controller.abort());
    lastSuccessfulInstance = winner.base;
    failedUntil.delete(winner.base);
    return winner.videos;
  } catch {
    settled = true;
    return null;
  }
}

export async function fetchInvidiousResults(query, options = {}) {
  const cleanQuery = String(query || '').trim().replace(/\s+/g, ' ');
  if (!cleanQuery) return [];

  const cached = getCached(cleanQuery);
  if (cached) return cached;

  const timeoutMs = options.timeoutMs ?? 8000;
  const logger = options.logger || console;

  let results = await raceInstances(PRIMARY_INSTANCES, cleanQuery, timeoutMs);
  if (!results) {
    results = await raceInstances(BACKUP_INSTANCES, cleanQuery, timeoutMs);
  }

  if (!results) {
    logger.warn?.('[Search] Every public instance failed');
    return [];
  }

  setCached(cleanQuery, results);
  return results;
}

export const SEARCH_INSTANCES = Object.freeze({
  primary: [...PRIMARY_INSTANCES],
  backup: [...BACKUP_INSTANCES],
});
