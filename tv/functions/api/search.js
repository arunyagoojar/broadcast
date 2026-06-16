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

  // Curated list of public Invidious instances
  const instances = [
    'https://iv.melmac.space',
    'https://inv.thepixora.com',
    'https://inv.tux.it',
    'https://invidious.perennialte.ch',
    'https://invidious.slipfox.xyz',
    'https://invidious.asir.dev',
    'https://yewtu.be',
  ];

  for (const base of instances) {
    try {
      const targetUrl = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
        }
      });
      clearTimeout(id);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          // Format results to matching client expectations
          const formatted = data.map((v) => ({
            id: v.videoId,
            title: v.title,
            dur: v.lengthSeconds || 300,
          }));

          return new Response(JSON.stringify(formatted), {
            headers: {
              'content-type': 'application/json',
              'access-control-allow-origin': '*',
            },
          });
        }
      }
    } catch (e) {
      console.warn(`[Proxy] Failed fetching from ${base}`);
    }
  }

  return new Response(JSON.stringify({ error: 'All instances failed' }), {
    status: 502,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    },
  });
}
