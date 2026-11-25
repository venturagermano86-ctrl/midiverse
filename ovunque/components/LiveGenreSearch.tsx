"use client";

import { useEffect, useState } from "react";
import { ChartTable } from "@/components/ChartTable";
import { getGenre, genreSearchTerm } from "@/lib/genres";
import type { Track } from "@/lib/types";

type Props = { genreSlug: string };

export function LiveGenreSearch({ genreSlug }: Props) {
  const genre = getGenre(genreSlug);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [note, setNote] = useState("Carico lane live…");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!genre) return;
    let cancelled = false;
    const term = genreSearchTerm(genre);
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/live/search?q=${encodeURIComponent(term)}&limit=28`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data.tracks)) {
          setTracks(data.tracks);
          setNote(data.note || `Live · ${term}`);
        } else {
          setTracks([]);
          setNote("Lane live non disponibile");
        }
      } catch {
        if (!cancelled) {
          setTracks([]);
          setNote("Offline");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [genreSlug, genre]);

  if (!genre) return null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-dig px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${
            loading ? "border border-line text-muted" : "bg-signal text-ink"
          }`}
        >
          {loading ? "…" : `${tracks.length} hits`}
        </span>
        <p className="text-sm text-soft">{note}</p>
      </div>
      {tracks.length > 0 ? (
        <ChartTable tracks={tracks} showRank={false} />
      ) : (
        <p className="rounded-dig-lg border border-line bg-panel px-4 py-8 text-sm text-muted">
          {loading ? "Cerco sul catalogo live…" : "Nessun hit in questa lane."}
        </p>
      )}
    </div>
  );
}
