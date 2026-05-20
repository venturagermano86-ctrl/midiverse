"use client";

import type { JobStatus } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  queued: "In coda…",
  analyzing: "Analisi in corso…",
  separating: "Separazione stem…",
  morphing: "Morphing in corso…",
  finalizing: "Finalizzazione…",
  completed: "Completato",
  failed: "Errore",
};

interface StatusIndicatorProps {
  job: JobStatus | null;
}

export function StatusIndicator({ job }: StatusIndicatorProps) {
  if (!job) return null;

  const label = STATUS_LABELS[job.status] ?? job.message ?? job.status;
  const progress = typeof job.progress === "number" ? job.progress : 0;
  const isError = job.status === "failed";
  const isDone = job.status === "completed";

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {!isDone && !isError && <Spinner />}
          {isDone && <CheckIcon />}
          {isError && <ErrorIcon />}
          <div>
            <p className="font-medium text-zinc-100">{label}</p>
            {job.message && job.message !== label && (
              <p className="text-sm text-zinc-400">{job.message}</p>
            )}
          </div>
        </div>
        <span className="text-sm tabular-nums text-zinc-400">{Math.round(progress)}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface-border">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isError ? "bg-red-500" : isDone ? "bg-emerald-500" : "bg-accent"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {isError && job.error && (
        <p className="mt-3 text-sm text-red-400">{job.error}</p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent"
      aria-hidden
    />
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
