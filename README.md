# Broadcast 📺

Broadcast is a web-based retro television simulator designed to recreate the tactile feeling, serendipity, and cozy aesthetic of late-night channel surfing on an old cathode-ray tube (CRT) television.

In a world dominated by highly polished, algorithmically-curated streaming platforms, Broadcast offers a nostalgic detour. By entering any topic, the application dynamically generates a set of thematic "channels" using YouTube search results (queried privately through your own free search proxy), allowing you to flip through content complete with CRT curvature, scanlines, static noise, glitchy transitions, and analog audio effects.

---

## The Concept: Why Broadcast?

The goal of Broadcast is to bring back the magic of *discovery* through channel surfing. 
* **Serendipity over Algorithms:** Instead of infinite scroll, you surf channels. You don't choose exactly what video to play next; you tune in to what is currently "airing."
* **Tactile Feedback:** Every interaction is designed to feel physical—from the satisfying click of the channel knob and the hum of static, to the physical toggle of the power button.
* **Atmosphere:** The application simulates realistic phosphor glow, scanline overlay, vignette shadow, screen jitter, and static noise transitions to transport you back to the era of analog television.

---

## Key Features

* **Dynamic Channel Generation:** Search for any subject (e.g., *90s commercial compile*, *retro gaming*, *lo-fi beats*, *space documentaries*) to instantly spin up a custom TV network with multiple active stations.
* **Authentic CRT Simulation:**
  * **Visual Filters:** Toggle between classic Color CRT, Green Phosphor, Amber Phosphor, and high-contrast Black & White modes.
  * **Screen Artifacts:** Curved screen simulation, subtle flicker, scanlines, and vignette shadows.
  * **Static Noise:** Realistic video static and white noise audio transitions when tuning or changing channels.
* **Tactile HUD Controls:** A side control panel featuring a physical rotary channel selector, volumetric dials, theme selector, power button, and a digital channel readout.
* **Save Networks:** Bookmark your favorite search terms as custom presets, allowing you to quickly return to your favorite topics.
* **Keyboard Shortcuts:** Full keyboard mapping for a seamless desktop experience:
  * `Arrow Up` / `Arrow Down` — Surf channels
  * `S` — Focus search box
  * `Space` — Toggle mute
  * `C` — Cycle color themes
  * `P` — Power on/off
  * `H` — Toggle HUD visibility

---

## Tech Stack

* **Frontend:** React + Vite
* **Styling:** Vanilla CSS (custom CRT filter system, animations, and responsive flex grid)
* **Video Engine:** YouTube IFrame Player API
* **Search:** A built-in keyless Cloudflare Worker proxy (deployed, zero config) that talks directly to YouTube's web search, with a public Invidious pool as fallback

---

## Search backend: why it kept breaking, and the fix

Broadcast used to search through a browser-side pool of public Invidious instances.
Those are volunteer-run mirrors of YouTube's internal web API, and YouTube has been
blocking them aggressively since 2023 — most public instances (Invidious and Piped)
are dead or half-dead at any given time, which is why search quietly stopped working
every few weeks.

There is **no third-party hosted service that is free forever and never breaks**:
everything keyless talks to YouTube's private web API, and YouTube keeps killing
hosted instances. What *is* stable is the API itself — YouTube's own web search
endpoint has worked without a key for years, and every surviving open-source project
([yt-dlp](https://github.com/yt-dlp/yt-dlp),
[NewPipe Extractor](https://github.com/TeamNewPipe/NewPipeExtractor),
[YouTube.js](https://github.com/LuanRT/YouTube.js)) uses exactly that.

So Broadcast now ships with its own search proxy, already deployed and built into
the app — **users configure nothing**:

1. `worker/src/worker.js` is a ~150-line, dependency-free Cloudflare Worker that
   forwards search queries to YouTube's own web search endpoint and returns
   normalized JSON. No API key, no quota, no third-party instances.
2. Its URL is baked into `src/api/proxySearch.js` as the default, so the deployed
   app works out of the box.
3. If the proxy is ever unreachable, the app still falls back to the public
   Invidious pool.
4. The worker only answers the app's own origin and localhost development
   (`ALLOWED_ORIGINS` in the worker), so strangers can't burn its free tier.

### For maintainers

The proxy runs on the free Cloudflare Workers tier (100,000 requests/day). If
YouTube ever changes its search response format, the worker walks the whole
payload for video entries (so it tolerates reshuffled JSON) and can be fixed in
one place:

```bash
cd worker
npx wrangler deploy
```

Hosting the frontend somewhere new? Add its origin to `ALLOWED_ORIGINS` in
`worker/src/worker.js` and redeploy. To point the app at a different proxy
without touching the default, set `window.BROADCAST_PROXY_URL` before load.

### Running the proxy locally

The worker uses only Web-standard APIs, so you can run it anywhere — including
Cloudflare's local dev (`npx wrangler dev` inside `worker/`) or any small Node
server that imports `worker/src/worker.js` and wraps its `fetch()` handler.

---

## Development & Setup

If you want to run this application locally:

### Prerequisites
Make sure you have Node.js installed on your machine.

### Installation & Launch

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open the link displayed in the terminal (usually `http://localhost:5173`) in your web browser.

### Tests

```bash
npm test
```

Covers the worker (parsing, caching, CORS, error passthrough) and the client search
chain (proxy preferred, Invidious failover, result validation).

---

## License

This project is licensed under the MIT License.
