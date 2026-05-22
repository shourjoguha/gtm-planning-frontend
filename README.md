# GTM Planning Engine — Frontend

React + Vite + TypeScript + Tailwind + shadcn/ui dashboard for the GTM Planning Engine.
Talks to the Flask backend on Railway via REST.

Backend repo: https://github.com/shourjoguha/GTM_Planning_Engine

## Stack

- Vite 5 + React 18 + TypeScript
- TanStack Query for data fetching
- Tailwind + shadcn/ui (Radix primitives)
- Plotly (basic dist) + Recharts
- Async job polling against `/api/jobs/run-plan`

## Develop

```bash
cp .env.example .env       # set VITE_API_BASE_URL
npm install
npm run dev                # http://localhost:8080
```

## Env vars

| var | default | meaning |
|---|---|---|
| `VITE_API_BASE_URL` | Railway prod URL | Backend root URL. No trailing slash. |
| `VITE_USE_ASYNC_JOBS` | `true` | Set to `false` to keep using legacy sync `/api/run-plan`. |
| `VITE_JOB_POLL_INTERVAL_MS` | `1500` | Poll cadence for `/api/jobs/{id}`. |
| `VITE_JOB_POLL_TIMEOUT_MS` | `600000` | Frontend abort timeout (10 min). |

## Build / Preview

```bash
npm run build
npm run preview            # serve ./dist locally
```

## Deploy — Cloudflare Pages (preferred)

1. Push to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Connect to Git.
3. Build command: `npm run build`. Output: `dist`.
4. Env vars: set `VITE_API_BASE_URL`.
5. After first build, copy the `*.pages.dev` URL and add to the backend's `EXTRA_CORS_ORIGINS` on Railway.

`public/_headers` and `public/_redirects` are picked up by Pages automatically.
SPA fallback is `/* → /index.html 200`.

## Deploy — Vercel (alternative)

1. Push to GitHub.
2. Import to Vercel.
3. Framework: Vite. Output: `dist`.
4. Env vars: `VITE_API_BASE_URL`.
5. `vercel.json` handles SPA rewrites + caching.

## Async job flow

```
POST /api/jobs/run-plan       → 202 { job_id, status: "queued" }
GET  /api/jobs/{job_id}       → { status: "running" | "done" | "error", result, error }
```

Frontend polls every `VITE_JOB_POLL_INTERVAL_MS`. On `done`, the version_id is
opened in the Results tab. Legacy `/api/run-plan` is still available and is used
automatically as a fallback if the async endpoint returns 404.

## Code layout

- `src/lib/api-config.ts` — backend URL + env knobs.
- `src/lib/api.ts` — typed API client (`runPlan`, `fetchJob`, `fetchVersions`, ...).
- `src/pages/Index.tsx` — main dashboard shell with tabs.
- `src/components/ConfigForm.tsx` — schema-driven config editor.
- `src/components/ResultsDashboard.tsx` — version summaries, plotly charts.
- `src/components/DocumentViewer.tsx` — README + version file viewer.

## Tests

```bash
npm test                   # vitest unit tests
npm run typecheck          # tsc --noEmit
```

## License

MIT
