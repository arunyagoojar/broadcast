# Broadcast 📺

Broadcast is a web-based retro television simulator designed to recreate the tactile feeling, serendipity, and cozy aesthetic of late-night channel surfing on an old cathode-ray tube (CRT) television.

In a world dominated by highly polished, algorithmically-curated streaming platforms, Broadcast offers a nostalgic detour. By entering any topic, the application dynamically generates a set of thematic "channels" using YouTube search results (queried privately via the Invidious API), allowing you to flip through content complete with CRT curvature, scanlines, static noise, glitchy transitions, and analog audio effects.

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
* **Search Backend:** Invidious API (for private, lightweight search indexing without direct YouTube API keys)

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

---

## License

This project is licensed under the MIT License.
