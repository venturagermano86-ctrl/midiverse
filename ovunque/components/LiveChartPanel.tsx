"use client";

import { useEffect, useState } from "react";
import { ChartTable } from "@/components/ChartTable";
import { UNDERGROUND_LANES, type LaneId } from "@/lib/live/underground";
import type { Track } from "@/lib/types";

type Props = {
  fallback: Track[];
};

export function LiveChartPanel({ fallback }: Props) {
  const [lane, setLane] = useState<LaneId>("all");
  const [tracks, setTracks] = useState<Track[]>(fallback);
  const [note, setNote] = useState("Carico chart underground…");
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/live/charts?lane=${lane}&limit=28`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data.tracks) && data.tracks.length > 0) {
          setTracks(data.tracks);
          setLive(true);
          setNote(data.note || "Chart underground · digi + vinyl misti");
        } else {
          setTracks(fallback);
          setLive(false);
          setNote("Chart live non disponibile — pick Dig List.");
        }
      } catch {
        if (!cancelled) {
          setTracks(fallback);
          setLive(false);
          setNote("Offline — pick Dig List.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lane, fallback]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {UNDERGROUND_LANES.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLane(l.id)}
            className={`rounded-dig px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider transition ${
              lane === l.id
                ? "bg-signal text-ink"
                : "border border-line text-muted hover:border-signal hover:text-signal"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-dig px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${
            live ? "bg-signal text-ink" : "border border-line text-muted"
          }`}
        >
          {loading ? "…" : live ? "Live · digi + 12\"" : "Curated"}
        </span>
        <p className="text-sm text-soft">{note}</p>
      </div>

      <ChartTable tracks={tracks} />
    </div>
  );
}
