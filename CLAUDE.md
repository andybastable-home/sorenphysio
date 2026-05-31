# Soren Physio — Claude Conventions

## Architecture
- Vanilla JS, no build step, static files served directly.
- Dexie/IndexedDB only — no backend, no auth, no AI.
- Single `app.js` (no modules, no bundler).
- Dexie via pinned CDN: `https://unpkg.com/dexie@4.4.2/dist/dexie.min.js` (also in SW SHELL).

## Design
- Visual direction is **Night Training**: dark canvas (`#0b0f14`), one volt-green
  accent (`#c6ff3d`), flat (no colored header bar), borders over drop-shadows.
- **`design-style-guide.html`** is the canonical visual reference: design tokens
  (the `:root` CSS custom properties live in `styles.css`), the component library,
  states, and reserved gamification patterns. Any new feature must build from those
  tokens/components so the app stays coherent — don't introduce new brand hues.
- `design-proposals.html` is the original direction comparison, kept for reference.

## Version discipline
Every commit that changes shell files must:
1. Bump the footer version in `index.html` (`<span id="version">`).
2. Bump `CACHE_VERSION` in `service-worker.js` to the same value.

Both must stay in sync so the service worker invalidates the old cache.

## Data model
- `EXERCISE_TEMPLATE` is a **hardcoded constant** in `app.js`. Never seed from DB.
- Exercise `id` values are **permanent** — never reuse an id for a different exercise.
- Completions compound-keyed on `[date+exerciseId]` — one row per exercise per day.
- `dateKey(d)` derives the local date with `getFullYear/getMonth/getDate`, NOT `toISOString()` (UTC rollover at midnight would corrupt the date key).
- Toggle = `db.completions.put(record)` (idempotent, no read-modify-write).

## Deploy
GitHub Pages → branch `main` / root (no CI). `start_url`/`scope` set to `.` so the
`/sorenphysio/` subpath works correctly without path configuration.
