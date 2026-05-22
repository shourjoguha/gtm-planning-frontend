// Single source of truth for backend URL.
// Configure with `VITE_API_BASE_URL` in `.env` / hosting env vars.
// Fallback is the production Railway deployment.

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
  "https://gtm-engine-sales-planning-tofu-production.up.railway.app";

export const USE_ASYNC_JOBS: boolean =
  (import.meta.env.VITE_USE_ASYNC_JOBS as string | undefined) !== "false";

export const JOB_POLL_INTERVAL_MS: number = Number(
  import.meta.env.VITE_JOB_POLL_INTERVAL_MS ?? 1500,
);

export const JOB_POLL_TIMEOUT_MS: number = Number(
  import.meta.env.VITE_JOB_POLL_TIMEOUT_MS ?? 600_000, // 10 min
);
