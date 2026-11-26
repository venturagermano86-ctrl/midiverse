"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  playNext,
  playPrev,
  scrubBy,
  seekPreview,
  subscribePlayer,
  togglePause,
  type PlayerSnapshot,
} from "@/lib/previewAudio";

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/** Barra fissa: scrub nella traccia + play su ogni pagina. */
export function BottomPlayer() {
  const [snap, setSnap] = useState<PlayerSnapshot | null>(null);

  useEffect(() => subscribePlayer(setSnap), []);

  if (!snap?.src && !snap?.id) return null;

  const hasQueue = snap.queue.length > 1;
  const dur = snap.duration || 0;
  const pct = dur > 0 ? Math.min(100, (snap.currentTime / dur) * 100) : 0;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-ink/95 px-3 py-2.5 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md md:px-6"
      role="region"
      aria-label="Player — scorri nella traccia"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-right text-[0.65rem] tabular-nums text-muted">
            {fmt(snap.currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={dur > 0 ? dur : 1}
            step={0.1}
            value={Math.min(snap.currentTime, dur || 0)}
            disabled={!dur}
            onChange={(e) => seekPreview(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full disabled:opacity-40"
            aria-label="Scorri nella traccia"
            style={{
              background: dur
                ? `linear-gradient(to right, var(--signal, #b8ff3c) ${pct}%, #2a2a2a ${pct}%)`
                : "#2a2a2a",
            }}
          />
          <span className="w-9 shrink-0 text-[0.65rem] tabular-nums text-muted">
            {fmt(dur)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {snap.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={snap.artworkUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-dig border border-line object-cover"
            />
          ) : (
            <div className="h-11 w-11 shrink-0 rounded-dig border border-line bg-panel" />
          )}

          <div className="min-w-0 flex-1">
            {snap.id ? (
              <Link
                href={`/traccia/${encodeURIComponent(snap.id)}`}
                className="block truncate text-sm font-bold text-mist hover:text-signal"
              >
                {snap.title || "Preview"}
              </Link>
            ) : (
              <p className="truncate text-sm font-bold text-mist">
                {snap.title || "Preview"}
              </p>
            )}
            <p className="truncate text-xs text-soft">
              {snap.artist || "—"}
              {hasQueue ? (
                <span className="text-muted">
                  {" "}
                  · {snap.index + 1}/{snap.queue.length}
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => scrubBy(-10)}
              className="hidden h-9 w-9 place-items-center rounded-dig text-[0.7rem] font-bold text-muted hover:bg-panel hover:text-mist sm:inline-grid"
              title="-10s"
              aria-label="Indietro 10 secondi"
            >
              −10
            </button>
            <button
              type="button"
              onClick={() => void playPrev()}
              className="inline-grid h-10 w-10 place-items-center rounded-dig border border-line text-mist hover:border-signal hover:text-signal"
              title="Precedente / riparti"
              aria-label="Precedente"
            >
              ‹‹
            </button>
            <button
              type="button"
              onClick={() => togglePause()}
              className="inline-grid h-11 w-11 place-items-center rounded-full bg-signal text-base font-black text-ink hover:bg-signal-hi"
              aria-label={snap.playing ? "Pausa" : "Play"}
            >
              {snap.playing ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              onClick={() => void playNext()}
              disabled={!hasQueue || snap.index >= snap.queue.length - 1}
              className="inline-grid h-10 w-10 place-items-center rounded-dig border border-line text-mist hover:border-signal hover:text-signal disabled:opacity-35"
              title="Successiva"
              aria-label="Successiva"
            >
              ››
            </button>
            <button
              type="button"
              onClick={() => scrubBy(10)}
              className="hidden h-9 w-9 place-items-center rounded-dig text-[0.7rem] font-bold text-muted hover:bg-panel hover:text-mist sm:inline-grid"
              title="+10s"
              aria-label="Avanti 10 secondi"
            >
              +10
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
