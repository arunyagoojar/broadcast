export async function searchYouTube(query) {
  try {
    const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.error('[TV] Proxy search failed:', e);
  }

  // Client-side fallback: directly querying known CORS-enabled public Invidious instances
  console.warn('[TV] Proxy search failed or returned empty. Trying direct client-side fallback...');
  const fallbackInstances = [
    'https://iv.melmac.space',
    'https://inv.thepixora.com',
  ];

  for (const base of fallbackInstances) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      const r = await fetch(
        `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
        { signal: controller.signal }
      );
      clearTimeout(id);
      if (r.ok) {
        const json = await r.json();
        if (Array.isArray(json) && json.length > 0) {
          return json.map((v) => ({
            id: v.videoId,
            title: v.title,
            dur: v.lengthSeconds || 300,
          }));
        }
      }
    } catch (e) {
      console.warn(`[TV] Fallback failed for: ${base}`, e);
    }
  }
  return null;
}
