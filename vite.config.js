import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom local proxy middleware that matches the Cloudflare Pages Function logic
function localSearchProxy() {
  return {
    name: 'local-search-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/search')) {
          const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const query = url.searchParams.get('q');
          
          if (!query) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing query parameter' }));
            return;
          }

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
                headers: { 'User-Agent': 'Mozilla/5.0' }
              });
              clearTimeout(id);

              if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                  const formatted = data.map((v) => ({
                    id: v.videoId,
                    title: v.title,
                    dur: v.lengthSeconds || 300,
                  }));

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(JSON.stringify(formatted));
                  return;
                }
              }
            } catch (err) {
              void err; // Fail silently and try next instance
            }
          }

          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: 'All instances failed' }));
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localSearchProxy()],
})

