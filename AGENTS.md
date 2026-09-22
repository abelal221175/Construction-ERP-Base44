# AGENTS.md — Construction ERP (Base44 imported app)

## Stack
- Vite 6.1 + React 18 SPA (no local backend — all data/auth via Base44 hosted SDK).
- UI: Tailwind CSS, shadcn/ui (Radix), react-router-dom, TanStack Query, recharts, framer-motion.
- App config lives in `base44/` (entities as `.jsonc`, `config.jsonc`).

## Running in the sandbox
- `docker compose -f docker-compose.base44.yml up -d --build` starts the Vite dev server on host port 3000 (container 5173).
- Source is bind-mounted; edits hot-reload without rebuilds.
- `npm install` runs automatically inside the container on startup.

## Required environment
- `VITE_BASE44_APP_ID` — the Base44 app ID (from the Base44 dashboard).
- `VITE_BASE44_BACKEND_URL` — Base44 server URL (typically `https://api.base44.com`).
- Both are Vite-prefixed (public, embedded at dev time via `import.meta.env`).
- Placeholders live in `.env.base44-defaults`; real values are delivered via `/run/base44/app.env`.
- `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` is passed bare from the host env so Vite 6.1 accepts the preview origin.

## Auth flow
- `src/lib/AuthContext.jsx` fetches public settings from the Base44 backend on mount.
- Without a valid `VITE_BASE44_APP_ID` / `VITE_BASE44_BACKEND_URL`, the app loads but cannot reach its backend (auth/data calls fail).
- The SDK client (`src/api/base44Client.js`) is created with `requiresAuth: false`.

## Verification
- `curl -s http://localhost:3000` should return the Vite-served HTML with the root div.
- Check `docker compose -f docker-compose.base44.yml logs web` for Vite compilation errors.
