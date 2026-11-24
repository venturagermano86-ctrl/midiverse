"use client";

import { useEffect, useState } from "react";
import { ChartTable } from "@/components/ChartTable";
import type { Track } from "@/lib/types";

type Props = {
  fallback: Track[];
};

export function LiveChartPanel({ fallback }: Props) {
  const [tracks, setTracks] = useState<Track[]>(fallback);
  const [note, setNote] = useState("Carico chart live Electronic/Dance…");
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/live/charts");
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data.tracks) && data.tracks.length > 0) {
          setTracks(data.tracks);
          setLive(true);
          setNote(
            data.note ||
              "Chart live · ogni traccia apre Beatport, Bandcamp, Juno e gli altri store reali",
          );
        } else {
          setNote("Chart live non disponibile — mostro i pick OVUNQUE.");
        }
      } catch {
        if (!cancelled) setNote("Chart live offline — pick OVUNQUE.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${
            live ? "bg-signal text-ink" : "border border-line text-muted"
          }`}
        >
          {live ? "Live catalog" : "Curated"}
        </span>
        <p className="text-sm text-muted">{note}</p>
      </div>
      <ChartTable tracks={tracks} />
    </div>
  );
}
