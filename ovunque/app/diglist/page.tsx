"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useWishlist } from "@/components/CollectionProvider";
import { RecordShelf } from "@/components/RecordShelf";
import { getBandcampUsername } from "@/lib/bandcampProfile";
import { loadDigPicks } from "@/lib/digPickBag";
import type { Track } from "@/lib/types";

function DigListResults() {
  const params = useSearchParams();
  const modeParam = params.get("mode") === "long" ? "long" : "short";
  const bag = params.get("bag");
  const seedsParam = params.get("seeds");
  const { tracks: owned } = useWishlist();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [note, setNote] = useState("Diglist croce in corso…");
  const [seedCount, setSeedCount] = useState(0);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"short" | "long">(modeParam);
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const packed = loadDigPicks(bag, seedsParam);
        const seeds = packed?.seeds ?? [];
        const mode = packed?.mode === "long" || modeParam === "long" ? "long" : "short";
        setMode(mode);

        if (seeds.length === 0) {
          setError(
            "Nessun pick — torna alla wishlist, tocca fino a 6 dischi, poi Short/Long.",
          );
          return;
        }
        setSeedCount(seeds.length);
        const res = await fetch("/api/diglist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            seeds,
            owned: owned.slice(0, 80),
            mode,
            bandcampUser: getBandcampUsername() || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          const err =
            data.error === "sign_in_required"
              ? "Apri l’app da Cursor (Private) o metti Team/Public"
              : data.error === "diglist_failed"
                ? "Rete Diglist in timeout — riprova Short"
                : data.error || `Errore ${res.status}`;
          setError(err);
          return;
        }
        setTracks(data.tracks ?? []);
        setGenres(Array.isArray(data.genres) ? data.genres : []);
        setNote(
          data.note ||
            "Incroci label: pick → label → artisti → altre label.",
        );
      } catch {
        if (!cancelled)
          setError("Rete lenta o sessione scaduta — riprova da Open App");
      }
    })();
    return () => {
      cancelled = true;
    };
    // owned.length evita loop su nuova ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeParam, bag, seedsParam, owned.length]);

  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
        Dig List · {mode} list
      </p>
      <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-mist md:text-4xl">
        {mode === "short" ? "Short list" : "Long list"}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-soft">
        {error || note}
        {seedCount > 0 && !error ? ` · from ${seedCount} pick${seedCount === 1 ? "" : "s"}` : ""}
      </p>
      {!error && genres.length > 0 ? (
        <p className="mt-2 text-xs text-muted">
          Filtri genere (solo UI): {genres.slice(0, 12).join(" · ")}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-4">
        <Link
          href="/wishlist"
          className="text-xs font-bold uppercase tracking-wider text-signal"
        >
          ← Back to picks
        </Link>
        <Link
          href="/account"
          className="text-xs font-bold uppercase tracking-wider text-muted hover:text-signal"
        >
          Bandcamp username
        </Link>
      </div>

      {error ? null : tracks.length === 0 ? (
        <p className="mt-12 text-muted">Incrocio compratori × collezioni…</p>
      ) : (
        <div className="mt-8">
          <RecordShelf tracks={tracks} />
        </div>
      )}
    </main>
  );
}

export default function DigListPage() {
  return (
    <Suspense fallback={<main className="px-4 py-10 text-muted">Loading dig list…</main>}>
      <DigListResults />
    </Suspense>
  );
}
