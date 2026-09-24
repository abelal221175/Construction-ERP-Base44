# Base44 Dev Environment

## Overview
This is a Base44-generated Vite + React app (Construction ERP) that uses the `@base44/sdk` and `@base44/vite-plugin` to connect to the Base44 cloud backend.

## Running the app
```bash
docker compose -f docker-compose.base44.yml up -d
```
- Web server: Vite dev server on port 5173, mapped to host port 3000
- Live reload: enabled (Vite HMR via bind-mounted source)
- Dependencies: installed at container startup via `npm install`

## Environment variables
- `VITE_BASE44_APP_ID` — Base44 app ID (placeholders in `.env.base44-defaults`; real values via `/run/base44/app.env`)
- `VITE_BASE44_BACKEND_URL` — Base44 backend URL (default: `https://api.base44.com`)
- Without real values, the app boots and renders UI but cannot load backend data

## Architecture
- Frontend: Vite + React 18 + TailwindCSS + Radix UI
- Backend: Base44 cloud platform (via `@base44/sdk`)
- Entities: defined in `base44/entities/*.jsonc`
- Auth: handled by `@base44/sdk` auth module (see `src/lib/AuthContext.jsx`)
- Routing: `react-router-dom` with config in `src/pages.config.js`
