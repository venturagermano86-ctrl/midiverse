"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Digger = {
  ownerSub: string;
  label: string;
  tracks: number;
  lastSaved: string;
  sampleTitles: string[];
  mine?: boolean;
};

export default function ListePage() {
  const [diggers, setDiggers] = useState<Digger[]>([]);
  const [note, setNote] = useState("Carico le liste digger…");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/liste");
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 401) {
          setError("Accedi per vedere le liste degli altri digger.");
          setNote("");
          return;
        }
        if (!res.ok) {
          setError(data.error || "Liste non disponibili");
          return;
        }
        setDiggers(Array.isArray(data.diggers) ? data.diggers : []);
        setNote(data.note || "");
      } catch {
        if (!cancelled) setError("Rete lenta — riprova");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
        Croce Diglist
      </p>
      <h1 className="mt-2 font-display text-3xl font-black text-mist md:text-4xl">
        Liste digger
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-soft">
        Wishlist condivise tra chi usa Dig List. Più liste visibili → croce migliore
        (stessi pezzi in comune → suggeriamo il resto della lista). ♥ salva nella tua
        wishlist cloud.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/wishlist"
          className="rounded-dig border border-line px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-muted hover:border-signal hover:text-signal"
        >
          La mia wishlist
        </Link>
        <Link
          href="/cerca"
          className="rounded-dig bg-signal px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-ink"
        >
          Cerca e ♥
        </Link>
      </div>

      {loading ? <p className="mt-10 text-muted">Carico…</p> : null}
      {error ? <p className="mt-10 text-ember">{error}</p> : null}
      {!loading && !error && note ? (
        <p className="mt-6 text-sm text-soft">{note}</p>
      ) : null}

      {!loading && !error && diggers.length === 0 ? (
        <div className="mt-10 max-w-lg space-y-3 border border-line bg-panel p-5">
          <h2 className="font-display text-xl font-black text-mist">Ancora vuoto</h2>
          <p className="text-sm text-soft">
            Quando tu e i colleghi salvate tracce con il cuore, le liste compaiono qui e
            Diglist può incrociarle (All Inn → altri pezzi delle stesse wishlist).
          </p>
        </div>
      ) : null}

      {diggers.length > 0 ? (
        <ul className="mt-8 divide-y divide-line border border-line">
          {diggers.map((d) => (
            <li key={d.ownerSub}>
              <Link
                href={`/liste/${encodeURIComponent(d.ownerSub)}`}
                className="flex flex-col gap-1 px-4 py-4 transition hover:bg-row sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-mist">
                    {d.label}
                    {d.mine ? (
                      <span className="ml-2 text-[0.65rem] font-bold uppercase tracking-wider text-signal">
                        tu
                      </span>
                    ) : null}
                  </p>
                  {d.sampleTitles.length ? (
                    <p className="mt-0.5 truncate text-xs text-soft">
                      {d.sampleTitles.join(" · ")}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-[0.7rem] font-bold uppercase tracking-wider text-signal">
                  {d.tracks} tracce →
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
