import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fetchInvidiousResults } from './src/api/searchBackend.js'

import { cloudflare } from "@cloudflare/vite-plugin";

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

          const formatted = await fetchInvidiousResults(query, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            logger: { warn() {} },
          });

          if (formatted.length > 0) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(formatted));
            return;
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
  plugins: [react(), localSearchProxy(), cloudflare()],
})