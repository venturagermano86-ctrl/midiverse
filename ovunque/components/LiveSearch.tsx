"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChartTable } from "@/components/ChartTable";
import { allGenres, searchTracks } from "@/lib/catalog";
import type { Track } from "@/lib/types";

export function LiveSearch() {
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const initialGenre = params.get("genre") ?? "Tutti";
  const [q, setQ] = useState(initialQ);
  const [genre, setGenre] = useState(
    allGenres().includes(initialGenre) ? initialGenre : "Tutti",
  );
  const [liveTracks, setLiveTracks] = useState<Track[]>([]);
  const [liveNote, setLiveNote] = useState("");
  const [loading, setLoading] = useState(false);
  const genres = allGenres();

  const curated = useMemo(() => searchTracks(q, genre), [q, genre]);

  useEffect(() => {
    const term = q.trim() || (genre !== "Tutti" ? genre : "house techno");
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/live/search?q=${encodeURIComponent(term)}&limit=30`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data.tracks)) {
          setLiveTracks(data.tracks);
          setLiveNote(data.note || "Risultati reali collegati agli store");
        } else {
          setLiveTracks([]);
          setLiveNote("Live search non disponibile");
        }
      } catch {
        if (!cancelled) {
          setLiveTracks([]);
          setLiveNote("Live search offline");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, genre]);

  return (
    <>
      <div className="mt-8 flex flex-col gap-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca traccia reale: artist, title…"
          className="w-full max-w-md border border-line bg-panel px-4 py-3 text-sm text-mist outline-none placeholder:text-muted focus:border-signal/60"
        />
        <div className="flex flex-wrap gap-1.5">
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenre(g)}
              className={`px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider transition ${
                genre === g
                  ? "bg-signal text-ink"
                  : "border border-line text-muted hover:border-signal/40 hover:text-mist"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl font-bold text-mist">Live stores</h2>
          <span className="bg-signal px-2 py-0.5 text-[0.65rem] font-bold uppercase text-ink">
            {loading ? "…" : `${liveTracks.length} hits`}
          </span>
        </div>
        <p className="mb-4 text-sm text-muted">
          {liveNote ||
            "Tracce reali: Apri store manda su Beatport, Bandcamp, Traxsource, Juno, Decks, Discogs…"}
        </p>
        {liveTracks.length > 0 ? (
          <ChartTable tracks={liveTracks} showRank={false} />
        ) : (
          <p className="border border-line bg-panel px-4 py-8 text-sm text-muted">
            {loading ? "Cerco sui cataloghi…" : "Nessun hit live — prova un’altra query."}
          </p>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-display text-xl font-bold text-mist">OVUNQUE picks</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Catalogo curato + prezzi campione ({curated.length})
        </p>
        <ChartTable tracks={curated} showRank={false} />
      </section>
    </>
  );
}
