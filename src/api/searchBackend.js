import { INVIDIOUS_INSTANCES, normalizeInvidiousResults } from './searchShared.js';

export async function fetchInvidiousResults(query, options = {}) {
  const timeoutMs = options.timeoutMs ?? 4000;
  const headers = options.headers || {};
  const logger = options.logger || console;

  for (const base of INVIDIOUS_INSTANCES) {
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
    } catch (err) {
      logger.warn?.(`[Proxy] Failed fetching from ${base}`, err);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return [];
}
