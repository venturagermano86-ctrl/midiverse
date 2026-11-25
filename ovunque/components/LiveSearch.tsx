"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChartTable } from "@/components/ChartTable";
import { searchTracks } from "@/lib/catalog";
import { ALL_GENRES, resolveGenre } from "@/lib/genres";
import type { Track } from "@/lib/types";

type MediaFilter = "all" | "digital" | "vinyl";

export function LiveSearch() {
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const initialGenre = params.get("genre") ?? "Tutti";
  const [q, setQ] = useState(initialQ);
  const [genre, setGenre] = useState(initialGenre);
  const [media, setMedia] = useState<MediaFilter>("all");
  const [liveTracks, setLiveTracks] = useState<Track[]>([]);
  const [liveNote, setLiveNote] = useState("");
  const [loading, setLoading] = useState(false);

  const genreChips = useMemo(
    () => ["Tutti", ...ALL_GENRES.map((g) => g.name)],
    [],
  );

  const curated = useMemo(() => {
    const base = searchTracks(q, genre === "Tutti" ? undefined : genre);
    if (media === "all") return base;
    return base.filter((t) =>
      media === "vinyl"
        ? t.offers.some((o) => o.media === "vinyl")
        : t.offers.some((o) => o.media !== "vinyl"),
    );
  }, [q, genre, media]);

  const filteredLive = useMemo(() => {
    if (media === "all") return liveTracks;
    return liveTracks.filter((t) =>
      media === "vinyl"
        ? t.offers.some((o) => o.media === "vinyl")
        : t.offers.some((o) => o.media !== "vinyl"),
    );
  }, [liveTracks, media]);

  useEffect(() => {
    const term =
      q.trim() ||
      (genre !== "Tutti" ? resolveGenre(genre).aliases[0] : "house techno");
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
          placeholder="Cerca traccia o disco: artist, title…"
          className="w-full max-w-md rounded-dig border border-line bg-panel px-4 py-3 text-sm text-mist outline-none placeholder:text-muted focus:border-signal/60"
        />

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "Tutto"],
              ["digital", "Solo digitale"],
              ["vinyl", "Solo vinile"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMedia(id)}
              className={`rounded-dig px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider transition ${
                media === id
                  ? "bg-signal text-ink"
                  : "border border-line text-muted hover:border-signal/40 hover:text-mist"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {genreChips.slice(0, 16).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenre(g)}
              className={`rounded-dig px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider transition ${
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
          <h2 className="font-display text-xl font-black text-mist">Live stores</h2>
          <span className="rounded-dig bg-signal px-2 py-0.5 text-[0.65rem] font-bold uppercase text-ink">
            {loading ? "…" : `${filteredLive.length} hits`}
          </span>
        </div>
        <p className="mb-4 text-sm text-soft">
          {liveNote ||
            "Filtra solo digitale / solo vinile. Apri la traccia: prezzi vicino, Discogs «da … + sped.», slider dai più economici."}
        </p>
        {filteredLive.length > 0 ? (
          <ChartTable tracks={filteredLive} showRank={false} />
        ) : (
          <p className="rounded-dig-lg border border-line bg-panel px-4 py-8 text-sm text-muted">
            {loading ? "Cerco sui cataloghi…" : "Nessun hit — prova un’altra query o filtro."}
          </p>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-display text-xl font-black text-mist">Dig List picks</h2>
        <p className="mt-1 mb-4 text-sm text-soft">
          Catalogo curato ({curated.length})
        </p>
        <ChartTable tracks={curated} showRank={false} />
      </section>
    </>
  );
}
