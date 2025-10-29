# COVID‑19 Educational Simulator (Web)

A lightweight **SEIRV** visualization that runs entirely in the browser. Works on **GitHub Pages** (static hosting) and does **not** require a backend.

## Files

- `index.html` — main webpage and UI
- `main.js` — JavaScript app (includes a built‑in fallback simulation so the page always works)
- `sim.py` — optional Python (Pyodide) simulation; if it defines `start(canvas, settings, hud)`, it will automatically be used
- `idea.html` — write‑up describing the concept and how to use it
- `README.md` — this file

## Run locally

Just open `index.html` in your browser. (If your browser blocks `fetch("./sim.py")` locally, use a tiny server: `python3 -m http.server` and visit `http://localhost:8000`.)

## Deploy to GitHub Pages

1. Create a new repository (or open your existing one).
2. Add these files at the **root** of the repo (not in a subfolder).
3. Commit & push.
4. In **Settings → Pages**, set **Source** to `Deploy from a branch`, then select:
   - **Branch**: `main` (or `master`)
   - **Folder**: `/ (root)`
5. Save. Your site will be available at `https://<your-username>.github.io/<repo-name>/` in a minute.

> Tip: After updating, hard‑refresh the page (`Ctrl+F5`/`Cmd+Shift+R`) to bypass the cache.

## Customizing

- Tweak sliders and labels in `index.html`.
- The JS fallback simulation logic lives in `main.js` (`step()` and `draw()`).
- If you prefer Python, implement your model inside `sim.py` and expose a `start()` function.
