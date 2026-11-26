"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChartTable } from "@/components/ChartTable";
import { searchTracks } from "@/lib/catalog";
import { GENRE_FAMILIES, resolveGenre } from "@/lib/genres";
import type { Track } from "@/lib/types";

type MediaFilter = "digital" | "vinyl";

const selectClass =
  "w-full min-w-[12rem] rounded-dig border border-line bg-panel px-3 py-2.5 text-sm text-mist outline-none focus:border-signal/60";

export function LiveSearch() {
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const initialGenre = params.get("genre") ?? "";
  const [q, setQ] = useState(initialQ);
  const [familySlug, setFamilySlug] = useState<string>("");
  const [genreSlug, setGenreSlug] = useState<string>("");
  const [media, setMedia] = useState<MediaFilter>("digital");
  const [liveTracks, setLiveTracks] = useState<Track[]>([]);
  const [liveNote, setLiveNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Se arriva ?genre=House dal link, mappa a famiglia/genere
  useEffect(() => {
    if (!initialGenre || initialGenre === "Tutti") return;
    const g = resolveGenre(initialGenre);
    if (g.slug && g.slug !== "dance-electro-pop") {
      setFamilySlug(g.familySlug);
      setGenreSlug(g.slug);
    }
  }, [initialGenre]);

  const family = useMemo(
    () => GENRE_FAMILIES.find((f) => f.slug === familySlug) ?? null,
    [familySlug],
  );

  const genreOptions = useMemo(() => {
    if (family) return family.genres;
    return GENRE_FAMILIES.flatMap((f) => f.genres);
  }, [family]);

  const selectedGenreName = useMemo(() => {
    if (!genreSlug) return "";
    const g = genreOptions.find((x) => x.slug === genreSlug);
    return g?.name ?? resolveGenre(genreSlug).name;
  }, [genreSlug, genreOptions]);

  const curated = useMemo(() => {
    const base = searchTracks(
      q,
      selectedGenreName || (family ? family.name : undefined),
    );
    return base.filter((t) =>
      media === "vinyl"
        ? t.offers.some((o) => o.media === "vinyl")
        : t.offers.some((o) => o.media !== "vinyl"),
    );
  }, [q, selectedGenreName, family, media]);

  const filteredLive = useMemo(() => {
    let list = liveTracks.filter((t) =>
      media === "vinyl"
        ? t.offers.some((o) => o.media === "vinyl")
        : t.offers.some((o) => o.media !== "vinyl"),
    );
    if (genreSlug) {
      list = list.filter((t) => resolveGenre(t.genre).slug === genreSlug);
    } else if (familySlug) {
      list = list.filter((t) => resolveGenre(t.genre).familySlug === familySlug);
    }
    return list;
  }, [liveTracks, media, genreSlug, familySlug]);

  useEffect(() => {
    const genreTerm = selectedGenreName
      ? resolveGenre(selectedGenreName).aliases[0] || selectedGenreName
      : family
        ? family.name.toLowerCase()
        : "";
    const term = q.trim() || genreTerm || "house techno";
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/live/search?q=${encodeURIComponent(term)}&limit=40`,
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
  }, [q, selectedGenreName, family]);

  return (
    <>
      <div className="mt-8 flex flex-col gap-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Artista, titolo, label… oppure Dig start sopra (link / YouTube)"
          className="w-full max-w-xl rounded-dig border border-line bg-panel px-4 py-3 text-sm text-mist outline-none placeholder:text-muted focus:border-signal/60"
        />

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["digital", "Digital"],
              ["vinyl", "Vinyl"],
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

        {/* Tendine: famiglia + tutti i generi (50) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[14rem] flex-1">
            <span className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
              Famiglia
            </span>
            <select
              className={selectClass}
              value={familySlug}
              onChange={(e) => {
                setFamilySlug(e.target.value);
                setGenreSlug("");
              }}
            >
              <option value="">Tutte le famiglie</option>
              {GENRE_FAMILIES.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.name} ({f.genres.length})
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-[14rem] flex-[1.4]">
            <span className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
              Genere ({genreOptions.length})
            </span>
            <select
              className={selectClass}
              value={genreSlug}
              onChange={(e) => setGenreSlug(e.target.value)}
            >
              <option value="">
                {family ? `Tutti in ${family.name}` : "Tutti i generi"}
              </option>
              {family
                ? family.genres.map((g) => (
                    <option key={g.slug} value={g.slug}>
                      {g.name}
                    </option>
                  ))
                : GENRE_FAMILIES.map((f) => (
                    <optgroup key={f.slug} label={f.name}>
                      {f.genres.map((g) => (
                        <option key={g.slug} value={g.slug}>
                          {g.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
            </select>
          </label>
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
            "Filtra digitale/vinile e genere dalle tendine. Apri la traccia e compra."}
        </p>
        {filteredLive.length > 0 ? (
          <ChartTable tracks={filteredLive} showRank={false} />
        ) : (
          <p className="rounded-dig-lg border border-line bg-panel px-4 py-8 text-sm text-muted">
            {loading ? "Cerco sui cataloghi…" : "Nessun hit — prova un’altra query o genere."}
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
