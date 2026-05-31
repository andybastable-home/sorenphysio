# Soren Physio

A Progressive Web App for Soren's daily physio exercises. Tap each exercise to mark it done. Ticks persist offline via IndexedDB.

## Run locally

```sh
npx serve .
# or
python -m http.server 8000
```

Open http://localhost:8000 in Chrome.

## Deploy

GitHub Pages → Settings → Pages → Deploy from branch → `main` / root.

The `start_url` and `scope` in `manifest.json` are set to `.` so the `/sorenphysio/` subpath works correctly.
