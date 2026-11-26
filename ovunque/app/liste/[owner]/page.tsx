"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChartTable } from "@/components/ChartTable";
import { encodeSeedsParam, stashDigPicks } from "@/lib/digPickBag";
import type { Track } from "@/lib/types";
import { useRouter } from "next/navigation";

type Item = { trackId: string; savedAt: string; track: Track };

export default function DiggerListPage() {
  const params = useParams();
  const router = useRouter();
  const owner = decodeURIComponent(String(params.owner ?? ""));
  const [label, setLabel] = useState("Digger");
  const [mine, setMine] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [status, setStatus] = useState("Carico lista…");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/liste/${encodeURIComponent(owner)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 401) {
          setError("Accedi per vedere questa lista.");
          setStatus("");
          return;
        }
        if (!res.ok) {
          setError(data.error || "Lista non disponibile");
          setStatus("");
          return;
        }
        setLabel(data.label || "Digger");
        setMine(!!data.mine);
        const list = Array.isArray(data.items) ? (data.items as Item[]) : [];
        setItems(list);
        setStatus(
          list.length
            ? `${list.length} tracce — tap fino a 6 per Short/Long (croce)`
            : "Lista vuota",
        );
      } catch {
        if (!cancelled) setError("Rete lenta");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner]);

  const tracks = items.map((i) => i.track);

  function toggle(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  }

  function goDig(mode: "short" | "long") {
    const seeds = tracks.filter((t) => picked.includes(t.id)).slice(0, 6);
    if (!seeds.length) {
      setStatus("Seleziona almeno 1 traccia dalla lista");
      return;
    }
    const bag = stashDigPicks(mode, seeds);
    const seedsParam = encodeSeedsParam(mode, seeds);
    router.push(
      `/diglist?mode=${mode}&bag=${encodeURIComponent(bag)}&seeds=${encodeURIComponent(seedsParam)}`,
    );
  }

  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <Link
        href="/liste"
        className="text-xs font-bold uppercase tracking-wider text-muted hover:text-signal"
      >
        ← Tutte le liste
      </Link>
      <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
        Lista digger{mine ? " · la tua" : ""}
      </p>
      <h1 className="mt-2 font-display text-3xl font-black text-mist">{label}</h1>
      {status ? <p className="mt-2 text-sm text-soft">{status}</p> : null}
      {error ? <p className="mt-4 text-ember">{error}</p> : null}

      {tracks.length > 0 ? (
        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">
              Pick per croce ({picked.length}/6)
            </p>
            {picked.length > 0 ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => goDig("short")}
                  className="rounded-dig bg-signal px-4 py-2 text-xs font-bold uppercase text-ink"
                >
                  Short list
                </button>
                <button
                  type="button"
                  onClick={() => goDig("long")}
                  className="rounded-dig border border-signal/50 px-4 py-2 text-xs font-bold uppercase text-signal"
                >
                  Long list
                </button>
              </div>
            ) : null}
          </div>
          <ul className="mb-4 flex flex-wrap gap-1.5">
            {tracks.map((t) => {
              const on = picked.includes(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => toggle(t.id)}
                    className={`max-w-[14rem] truncate rounded-dig border px-2 py-1 text-left text-[0.7rem] ${
                      on
                        ? "border-signal bg-signal/15 text-mist"
                        : "border-line text-muted hover:border-signal/40"
                    }`}
                  >
                    {on ? "✓ " : ""}
                    {t.artist} — {t.title}
                  </button>
                </li>
              );
            })}
          </ul>
          <ChartTable tracks={tracks} showRank={false} />
        </div>
      ) : null}
    </main>
  );
}
