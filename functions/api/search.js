export function normalizeInvidiousResults(data) {
  if (!Array.isArray(data)) return [];
  return data
    .map((v) => ({
      id: v.videoId || v.id,
      title: v.title || '',
      dur: Number(v.lengthSeconds || v.dur || 300),
    }))
    .filter((v) => v.id && typeof v.id === 'string');
}

let cachedInstances = null;
let lastFetchTime = 0;

const INVIDIOUS_INSTANCES = [
  'https://iv.melmac.space',
  'https://inv.thepixora.com',
  'https://inv.tux.it',
  'https://invidious.perennialte.ch',
  'https://invidious.slipfox.xyz',
  'https://invidious.asir.dev',
  'https://yewtu.be',
];

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
        .slice(0, 5);
      
      if (instances.length > 0) {
        cachedInstances = instances;
        lastFetchTime = Date.now();
        return instances;
      }
    }
  } catch (err) {
  }
  return INVIDIOUS_INSTANCES;
}

export async function fetchInvidiousResults(query, options = {}) {
  const timeoutMs = options.timeoutMs ?? 10000;
  const instances = await getInstances();

  try {
    const results = await Promise.any(
      instances.map(async (base) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const targetUrl = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
          const response = await fetch(targetUrl, { signal: controller.signal });
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
  }
  return [];
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  
  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
      status: 400,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      },
    });
  }

  const results = await fetchInvidiousResults(query, {});

  if (results.length > 0) {
    return new Response(JSON.stringify(results), {
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      },
    });
  }

  return new Response(JSON.stringify({ error: 'All instances failed' }), {
    status: 502,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    },
  });
}
