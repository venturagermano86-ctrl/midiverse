"use client";

import { useCallback, useState } from "react";

interface UploadZoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

const ACCEPT = "audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aiff";

export function UploadZone({ file, onFileSelect, disabled }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFileSelect(dropped);
    },
    [disabled, onFileSelect],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`
        relative rounded-2xl border-2 border-dashed p-10 text-center transition-colors
        ${dragOver ? "border-accent bg-accent/10" : "border-surface-border bg-surface-card"}
        ${disabled ? "pointer-events-none opacity-50" : "cursor-pointer hover:border-accent/60"}
      `}
    >
      <input
        type="file"
        accept={ACCEPT}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
      />
      <UploadIcon />
      <p className="mt-4 text-lg font-medium text-zinc-100">
        Trascina la Source Reference qui
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        oppure clicca per selezionare (MP3, WAV, FLAC…)
      </p>
      {file && (
        <p className="mt-4 inline-block rounded-lg bg-surface-border px-3 py-1 text-sm text-accent">
          {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
        </p>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/20 text-accent">
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
    </div>
  );
}
