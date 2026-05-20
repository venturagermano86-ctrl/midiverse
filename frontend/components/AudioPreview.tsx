"use client";

interface AudioPreviewProps {
  title: string;
  src: string | null;
  downloadHref?: string | null;
}

export function AudioPreview({ title, src, downloadHref }: AudioPreviewProps) {
  if (!src) return null;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-zinc-100">{title}</h3>
        {downloadHref && (
          <a
            href={downloadHref}
            download
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-muted"
          >
            Scarica WAV
          </a>
        )}
      </div>
      <audio controls className="w-full" src={src} preload="metadata">
        Il browser non supporta la riproduzione audio.
      </audio>
    </div>
  );
}
