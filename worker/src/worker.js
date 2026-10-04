// Broadcast search proxy.
//
// Queries YouTube's own public web search endpoint (InnerTube) directly —
// no API key, no quota, no third-party instances. Deploy this once on the
// free Cloudflare Workers tier (`npx wrangler deploy`) and point Broadcast
// at it in Settings. The file uses only Web-standard APIs so it can also be
// exercised locally in Node (see test/worker.test.js).

const CLIENT_VERSION = '2.20250915.01.00';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const INNERTUBE_URL = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false';
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;

// Keep the free tier for the app itself: answer the production site,
// localhost development, and server-side calls without an Origin header.
const ALLOWED_ORIGINS = new Set(['https://brodcast.eu.cc']);
const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN_PATTERN.test(origin);
}

const responseCache = new Map();

function parseDuration(text) {
  if (!text) return 0;
  const parts = String(text)
    .split(':')
    .map((part) => Number.parseInt(part, 10));
  if (!parts.length || parts.some((part) => Number.isNaN(part))) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

// Walks the whole payload for `videoRenderer` nodes instead of hardcoding the
// response path, so it keeps working when YouTube reshuffles containers.
function collectVideoRenderers(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) collectVideoRenderers(child, out);
    return;
  }
  const renderer = node.videoRenderer;
  if (renderer && typeof renderer.videoId === 'string') {
    const title =
      renderer.title?.runs?.[0]?.text ?? renderer.title?.simpleText ?? '';
    out.push({
      id: renderer.videoId,
      title,
      dur: parseDuration(renderer.lengthText?.simpleText),
    });
  }
  for (const value of Object.values(node)) collectVideoRenderers(value, out);
}

export async function searchYouTubeWeb(query) {
  const response = await fetch(INNERTUBE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': USER_AGENT,
      'x-youtube-client-name': '1',
      'x-youtube-client-version': CLIENT_VERSION,
      'accept-language': 'en-US,en;q=0.9',
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: CLIENT_VERSION,
          hl: 'en',
          gl: 'US',
        },
      },
      query,
    }),
  });

  if (!response.ok) {
    throw new Error(`YouTube responded ${response.status}`);
  }

  const found = [];
  collectVideoRenderers(await response.json(), found);

  const videos = [];
  const seen = new Set();
  for (const video of found) {
    if (!VIDEO_ID_PATTERN.test(video.id) || seen.has(video.id)) continue;
    seen.add(video.id);
    videos.push(video);
  }
  if (!videos.length) throw new Error('YouTube returned no usable videos');
  return videos;
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'content-type': 'application/json; charset=utf-8',
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

function getCached(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.videos;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (!isAllowedOrigin(request.headers.get('origin'))) {
      return json({ error: 'forbidden' }, 403);
    }

    const url = new URL(request.url);
    if (url.pathname !== '/search') {
      return json({ error: 'not found' }, 404);
    }

    const query = (url.searchParams.get('q') || '').trim().replace(/\s+/g, ' ');
    if (!query) return json({ videos: [] });

    if (env?.PROXY_TOKEN && url.searchParams.get('token') !== env.PROXY_TOKEN) {
      return json({ error: 'unauthorized' }, 401);
    }

    const cached = getCached(query);
    if (cached) return json({ videos: cached });

    try {
      const videos = await searchYouTubeWeb(query);
      responseCache.delete(query);
      responseCache.set(query, { at: Date.now(), videos });
      if (responseCache.size > MAX_CACHE_ENTRIES) {
        responseCache.delete(responseCache.keys().next().value);
      }
      return json({ videos });
    } catch (error) {
      return json({ error: error.message }, 502);
    }
  },
};
