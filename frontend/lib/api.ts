/**
 * Client API — fase 2: upload, SSE progresso, download.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface ProcessResponse {
  job_id: string;
  status: JobStatus;
  message: string;
  status_url: string;
}

// TODO: implementare upload FormData verso POST /process
export async function enqueueProcess(_file: File, _mode: "morph" | "timbre"): Promise<ProcessResponse> {
  throw new Error("Non implementato — fase 2");
}

export function apiUrl(path: string): string {
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}
