"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CoverArt } from "@/components/CoverArt";
import {
  allGenres,
  cheapestOffer,
  formatPrice,
  searchTracks,
} from "@/lib/catalog";
import { storeName } from "@/lib/stores";

export default function SearchPage() {
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [genre, setGenre] = useState("Tutti");
  const genres = allGenres();

  const results = useMemo(() => searchTracks(q, genre), [q, genre]);

  return (
    <main className="px-5 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-3xl font-extrabold text-mist md:text-4xl">Catalogo</h1>
      <p className="mt-2 max-w-xl text-sm text-mist/50">
        Tutti i generi insieme. Apri una traccia per vedere su quali portali si compra e quanto costa.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtra per titolo, artista, label…"
          className="w-full max-w-md rounded-sm border border-white/15 bg-white/5 px-4 py-3 text-sm text-mist outline-none placeholder:text-mist/35 focus:border-signal/50"
        />
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenre(g)}
              className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition ${
                genre === g
                  ? "bg-signal text-ink"
                  : "border border-white/10 text-mist/60 hover:border-white/25 hover:text-mist"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-xs uppercase tracking-wider text-mist/40">
        {results.length} tracc{results.length === 1 ? "ia" : "e"}
      </p>

      <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
        {results.map((track, i) => {
          const best = cheapestOffer(track);
          const multi = track.offers.length > 1;
          return (
            <li key={track.id} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
              <Link
                href={`/traccia/${track.id}`}
                className="flex items-center gap-4 py-4 transition hover:bg-white/[0.03]"
              >
                <CoverArt
                  hue={track.coverHue}
                  title={track.title}
                  className="h-14 w-14 shrink-0 rounded-sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-semibold text-mist">{track.title}</p>
                  <p className="truncate text-sm text-mist/50">
                    {track.artist} · {track.genre}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="font-semibold text-signal">{formatPrice(best.priceEur)}</p>
                  <p className="text-xs text-mist/40">
                    {multi
                      ? `${track.offers.length} portali · da ${storeName(best.storeId)}`
                      : `solo ${storeName(best.storeId)}`}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {results.length === 0 && (
        <p className="py-16 text-center text-mist/45">Nessuna traccia con questi filtri.</p>
      )}
    </main>
  );
}
