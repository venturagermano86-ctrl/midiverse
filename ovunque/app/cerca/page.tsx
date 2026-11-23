"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChartTable } from "@/components/ChartTable";
import { allGenres, searchTracks } from "@/lib/catalog";

export default function SearchPage() {
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const initialGenre = params.get("genre") ?? "Tutti";
  const [q, setQ] = useState(initialQ);
  const [genre, setGenre] = useState(
    allGenres().includes(initialGenre) ? initialGenre : "Tutti",
  );
  const genres = allGenres();
  const results = useMemo(() => searchTracks(q, genre), [q, genre]);

  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-signal">Catalog</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-mist md:text-4xl">Tracks</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Lista stile Beatport: filtra per genere, apri la traccia, compra sul portale più conveniente
        (o scarica free).
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter title, artist, label…"
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

      <p className="mt-6 text-[0.65rem] uppercase tracking-wider text-muted">
        {results.length} result{results.length === 1 ? "" : "s"}
      </p>
      <div className="mt-3">
        <ChartTable tracks={results} showRank={false} />
      </div>
    </main>
  );
}
