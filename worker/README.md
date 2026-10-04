# Broadcast search proxy

A dependency-free Cloudflare Worker that gives Broadcast reliable YouTube search
with no API key and **no user configuration**. It forwards queries to YouTube's
own public web search endpoint (InnerTube, the same one every browser YouTube
tab uses) and returns normalized `{ videos: [{ id, title, dur }] }` JSON with
permissive CORS headers.

The deployed URL (`https://broadcast-search.arunyagoojar.workers.dev`) is baked
into `src/api/proxySearch.js` as the app's default search backend, so the
deployed app works out of the box.

## Access control

The worker only answers:

- `https://brodcast.eu.cc` (production)
- `http://localhost:*` / `http://127.0.0.1:*` (development)
- requests without an `Origin` header (tests, curl)

Everything else gets `403` — add a new origin to `ALLOWED_ORIGINS` in
`src/worker.js` if the app is hosted somewhere else.

## Redeploy

```bash
cd worker
npx wrangler deploy
```

Free tier: 100,000 requests/day — plenty for channel surfing.

## Endpoints

- `GET /search?q=<query>` — search videos.
- `OPTIONS *` — CORS preflight.

Results are cached in-memory for 5 minutes per isolate.
