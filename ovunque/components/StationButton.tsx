"use client";

import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { Track } from "@/lib/types";

type Props = {
  track: Track;
  compact?: boolean;
};

/** Station nella stessa scheda (SPA) — non apre pagine nuove. */
export function StationButton({ track, compact }: Props) {
  const router = useRouter();
  const href = `/station/${encodeURIComponent(track.id)}`;

  function openStation(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.setItem(
        `dig.station.seed.${track.id}`,
        JSON.stringify(track),
      );
    } catch {
      /* ignore quota */
    }
    router.push(href);
  }

  return (
    <button
      type="button"
      onClick={openStation}
      title="Apri Station"
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
