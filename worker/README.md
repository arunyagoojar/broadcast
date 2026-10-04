# Broadcast search proxy

A dependency-free Cloudflare Worker that gives Broadcast reliable YouTube search
with no API key. It forwards queries to YouTube's own public web search endpoint
(InnerTube, the same one every browser YouTube tab uses) and returns normalized
`{ videos: [{ id, title, dur }] }` JSON with permissive CORS headers.

## Deploy

```bash
npx wrangler login
npx wrangler deploy
```

Paste the printed `*.workers.dev` URL into Broadcast's **SETTINGS → SEARCH PROXY**.

Free tier: 100,000 requests/day — plenty for channel surfing.

## Optional: require a token

```bash
npx wrangler secret put PROXY_TOKEN   # enter any secret string
```

Then paste the same token into the app's settings panel. Without a token the
proxy is open to anyone who knows the URL.

## Endpoints

- `GET /search?q=<query>` — search videos. Optional `&token=` when `PROXY_TOKEN` is set.
- `OPTIONS *` — CORS preflight.

Results are cached in-memory for 5 minutes per isolate.
