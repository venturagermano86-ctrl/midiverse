"use client";

import type { MouseEvent } from "react";
import type { Track } from "@/lib/types";

type Props = {
  track: Track;
  compact?: boolean;
};

/** Station → nuova scheda browser (SoundCloud / Dig List style). */
export function StationButton({ track, compact }: Props) {
  const href = `/station/${encodeURIComponent(track.id)}`;

  function openStation(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      sessionStorage.setItem(
        `dig.station.seed.${track.id}`,
        JSON.stringify(track),
      );
    } catch {
      /* ignore quota */
    }
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={openStation}
      title="Apri Station in una nuova scheda"
      className={
        compact
          ? "inline-flex items-center gap-1 rounded-dig border border-signal/45 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-signal transition hover:bg-signal hover:text-ink"
          : "inline-flex items-center gap-2 rounded-dig border border-signal/45 px-4 py-3 text-sm font-bold text-signal transition hover:bg-signal hover:text-ink"
      }
    >
      <span aria-hidden className="text-[0.85em]">
        ◉
      </span>
      Station
    </button>
  );
}
