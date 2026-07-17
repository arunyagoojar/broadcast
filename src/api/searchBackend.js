import { INVIDIOUS_INSTANCES, normalizeInvidiousResults } from './searchShared.js';

let cachedInstances = null;
let lastFetchTime = 0;

async function getInstances() {
  if (cachedInstances && (Date.now() - lastFetchTime < 1000 * 60 * 60)) {
    return cachedInstances;
  }
  try {
    const res = await fetch('https://api.invidious.io/instances.json?sort_by=health');
    if (res.ok) {
      const data = await res.json();
      const instances = data
        .filter(item => item[1] && item[1].type === 'https' && item[1].api === true && item[1].cors === true)
        .map(item => item[1].uri)
        .slice(0, 7);
      
      if (instances.length > 0) {
        cachedInstances = instances;
        lastFetchTime = Date.now();
        return instances;
      }
    }
  } catch (err) {
    // fallback to static list
  }
  return INVIDIOUS_INSTANCES;
}

export async function fetchInvidiousResults(query, options = {}) {
  const timeoutMs = options.timeoutMs ?? 10000;
  const headers = options.headers || {};
  const logger = options.logger || console;

  const instances = await getInstances();
  const topInstances = instances.slice(0, 5);

  try {
    const results = await Promise.any(
      topInstances.map(async (base) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const targetUrl = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
          const response = await fetch(targetUrl, {
            signal: controller.signal,
            headers,
          });

          if (response.ok) {
            const data = await response.json();
            const formatted = normalizeInvidiousResults(data);
            if (formatted.length > 0) return formatted;
          }
        } finally {
          clearTimeout(timeoutId);
        }
        
        throw new Error("Empty or failed");
      })
    );
    return results;
  } catch (err) {
    logger.warn?.(`[Proxy] All parallel fetches failed`);
  }

  return [];
}
