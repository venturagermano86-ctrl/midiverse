"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { RecordShelf } from "@/components/RecordShelf";
import type { Track } from "@/lib/types";

function DigListResults() {
  const params = useSearchParams();
  const mode = params.get("mode") === "long" ? "long" : "short";
  const [tracks, setTracks] = useState<Track[]>([]);
  const [note, setNote] = useState("Building your dig list…");
  const [seedCount, setSeedCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = sessionStorage.getItem("dig.pick.seeds");
        if (!raw) {
          setError("Nessun pick — torna alla wishlist e seleziona fino a 6 dischi.");
          return;
        }
        const parsed = JSON.parse(raw) as { seeds?: Track[]; mode?: string };
        const seeds = parsed.seeds ?? [];
        setSeedCount(seeds.length);
        const res = await fetch("/api/diglist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ seeds, mode }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Dig list fallita");
          return;
        }
        setTracks(data.tracks ?? []);
        setNote(data.note || "Your dig list");
      } catch {
        if (!cancelled) setError("Offline — riprova.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

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
      <div className="mt-4">
        <Link
          href="/wishlist"
          className="text-xs font-bold uppercase tracking-wider text-signal"
        >
          ← Back to picks
        </Link>
      </div>

      {error ? null : tracks.length === 0 ? (
        <p className="mt-12 text-muted">Carico consigliati…</p>
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
