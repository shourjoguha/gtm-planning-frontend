import type { GTMConfig, PlanVersion, PlanSummary, PlanResult } from "@/types/config";
import {
  API_BASE,
  USE_ASYNC_JOBS,
  JOB_POLL_INTERVAL_MS,
  JOB_POLL_TIMEOUT_MS,
} from "@/lib/api-config";

type RawVersionList = {
  versions?: Array<{ id: string; created: number; description?: string }>;
};

type RawSummary = {
  total_annual_bookings?: number;
  total_annual_saos?: number;
  total_in_window_bookings?: number;
  total_deferred_bookings?: number;
  average_weighted_roi?: number;
  capacity_constrained_months?: number;
  months_capacity_constrained?: number;
  segment_summary?: {
    projected_bookings?: Record<string, number>;
    required_saos?: Record<string, number>;
    share?: Record<string, number>;
    weighted_roi?: Record<string, number>;
  } | Record<string, {
    total_bookings: number;
    total_saos: number;
    avg_share: number;
    avg_asp: number;
    avg_cw_rate: number;
  }>;
  validation?: PlanSummary["validation"];
};

export type JobStatus = "queued" | "running" | "done" | "error";

export type JobState = {
  job_id: string;
  status: JobStatus;
  queued_at?: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  description?: string;
  result?: {
    version_id: string;
    summary: RawSummary;
    validation_passed: boolean;
    charts?: { status: string; port?: number; url?: string; error?: string };
  };
  error?: string;
};

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

function normalizeSegmentSummary(raw: RawSummary["segment_summary"]): PlanSummary["segment_summary"] {
  if (!raw) return {};

  if ("projected_bookings" in raw || "required_saos" in raw || "share" in raw) {
    const bookings = raw.projected_bookings ?? {};
    const saos = raw.required_saos ?? {};
    const shares = raw.share ?? {};
    const roi = raw.weighted_roi ?? {};
    const keys = Array.from(new Set([...Object.keys(bookings), ...Object.keys(saos), ...Object.keys(shares), ...Object.keys(roi)]));

    return Object.fromEntries(
      keys.map((key) => [
        key,
        {
          total_bookings: bookings[key] ?? 0,
          total_saos: saos[key] ?? 0,
          avg_share: shares[key] ?? 0,
          avg_asp: 0,
          avg_cw_rate: 0,
        },
      ]),
    );
  }

  return raw as PlanSummary["segment_summary"];
}

function normalizeSummary(raw: RawSummary): PlanSummary {
  return {
    total_annual_bookings: raw.total_annual_bookings ?? 0,
    total_annual_saos: raw.total_annual_saos ?? 0,
    total_in_window_bookings: raw.total_in_window_bookings ?? 0,
    total_deferred_bookings: raw.total_deferred_bookings ?? 0,
    average_weighted_roi: raw.average_weighted_roi ?? 0,
    capacity_constrained_months: raw.capacity_constrained_months ?? raw.months_capacity_constrained ?? 0,
    segment_summary: normalizeSegmentSummary(raw.segment_summary),
    validation: raw.validation ?? { passed: true, checks: [] },
  };
}

export async function fetchConfigSchema(): Promise<GTMConfig> {
  return apiFetch<GTMConfig>("/api/config-schema");
}

/**
 * Submit a plan. Uses the async job endpoint when available; falls back
 * to the legacy synchronous endpoint for older backends.
 *
 * If `onStatus` is supplied, it is called with each polled state until completion.
 */
export async function runPlan(
  config: GTMConfig,
  options: { onStatus?: (s: JobState) => void; signal?: AbortSignal } = {},
): Promise<{ version_id: string }> {
  if (!USE_ASYNC_JOBS) {
    return apiFetch<{ version_id: string }>("/api/run-plan", {
      method: "POST",
      body: JSON.stringify(config),
    });
  }

  let job: { job_id: string; status: JobStatus };
  try {
    job = await apiFetch<{ job_id: string; status: JobStatus }>("/api/jobs/run-plan", {
      method: "POST",
      body: JSON.stringify(config),
    });
  } catch (e) {
    // Backend without async endpoint → fall back.
    if (e instanceof Error && /404|not found/i.test(e.message)) {
      return apiFetch<{ version_id: string }>("/api/run-plan", {
        method: "POST",
        body: JSON.stringify(config),
      });
    }
    throw e;
  }

  const started = Date.now();
  while (true) {
    if (options.signal?.aborted) {
      throw new Error("Job polling aborted");
    }
    if (Date.now() - started > JOB_POLL_TIMEOUT_MS) {
      throw new Error(`Job ${job.job_id} did not finish within ${JOB_POLL_TIMEOUT_MS}ms`);
    }
    await new Promise((r) => setTimeout(r, JOB_POLL_INTERVAL_MS));
    const state = await fetchJob(job.job_id);
    options.onStatus?.(state);
    if (state.status === "done" && state.result) {
      return { version_id: state.result.version_id };
    }
    if (state.status === "error") {
      throw new Error(state.error || "Plan job failed");
    }
  }
}

export async function fetchJob(jobId: string): Promise<JobState> {
  return apiFetch<JobState>(`/api/jobs/${jobId}`);
}

export async function fetchJobs(): Promise<JobState[]> {
  const data = await apiFetch<{ jobs: JobState[] }>("/api/jobs");
  return data.jobs ?? [];
}

export async function fetchVersions(): Promise<PlanVersion[]> {
  const data = await apiFetch<RawVersionList>("/api/versions");
  return (data.versions ?? []).map((v) => ({
    version_id: v.id,
    timestamp: new Date(v.created * 1000).toISOString(),
    config_hash: "",
  }));
}

export async function fetchVersionSummary(versionId: string): Promise<PlanSummary> {
  const data = await apiFetch<RawSummary>(`/api/version/${versionId}/summary`);
  return normalizeSummary(data);
}

export async function fetchVersionResults(versionId: string): Promise<PlanResult[]> {
  return apiFetch<PlanResult[]>(`/api/version/${versionId}/results`);
}

export async function checkHealth(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>("/health");
}

export async function fetchVersionFiles(versionId: string): Promise<string[]> {
  const data = await apiFetch<{ files: string[] }>(`/api/version/${versionId}/files`);
  return data.files;
}

export async function fetchVersionFile(versionId: string, filename: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/version/${versionId}/download/${filename}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`File not found: ${filename}`);
  return res.text();
}

export async function fetchVersionRecommendations(versionId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/version/${versionId}/recommendations`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.text();
  } catch { return null; }
}
