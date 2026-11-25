"use client";

import { useEffect, useState } from "react";
import { ChartTable } from "@/components/ChartTable";
import { SubmitFreeTrack } from "@/components/SubmitFreeTrack";
import { UNDERGROUND_LANES, type LaneId } from "@/lib/live/underground";
import type { Track } from "@/lib/types";

type ChartLane = "wishlisted" | "free" | LaneId;

const LANES: { id: ChartLane; label: string }[] = [
  { id: "wishlisted", label: "Most wishlisted" },
  { id: "free", label: "Free downloads" },
  ...UNDERGROUND_LANES.map((l) => ({ id: l.id as ChartLane, label: l.label })),
];

type Props = {
  fallback: Track[];
};

export function LiveChartPanel({ fallback }: Props) {
  const [lane, setLane] = useState<ChartLane>("wishlisted");
  const [tracks, setTracks] = useState<Track[]>(fallback);
  const [note, setNote] = useState("Carico chart…");
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/live/charts?lane=${lane}&limit=28`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data.tracks) && data.tracks.length > 0) {
          setTracks(data.tracks);
          setLive(true);
          setNote(data.note || "Chart live");
        } else if (lane === "wishlisted" || lane === "free") {
          setTracks([]);
          setLive(true);
          setNote(
            data.note ||
              (lane === "free"
                ? "Free chart vuota — aggiungi un download gratis"
                : "Ancora vuota — salva in wishlist"),
          );
        } else {
          setTracks(fallback);
          setLive(false);
          setNote("Chart live non disponibile — pick Dig List.");
        }
      } catch {
        if (!cancelled) {
          setTracks(lane === "wishlisted" || lane === "free" ? [] : fallback);
          setLive(false);
          setNote("Offline.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lane, fallback, tick]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {LANES.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLane(l.id)}
            className={`rounded-dig px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider transition ${
              lane === l.id
                ? "bg-signal text-ink"
                : "border border-line text-muted hover:border-signal hover:text-signal"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-dig px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${
            live ? "bg-signal text-ink" : "border border-line text-muted"
          }`}
        >
          {loading
            ? "…"
            : lane === "wishlisted"
              ? "Community"
              : lane === "free"
                ? "Free"
                : live
                  ? "Live · digi + 12\""
                  : "Curated"}
        </span>
        <p className="text-sm text-soft">{note}</p>
      </div>

      {lane === "free" ? (
        <div className="mb-8">
          <SubmitFreeTrack
            onSubmitted={() => {
              setLane("free");
              setTick((n) => n + 1);
            }}
          />
        </div>
      ) : null}

      {(lane === "wishlisted" || lane === "free") && tracks.length === 0 && !loading ? (
        <p className="rounded-dig-lg border border-line bg-panel px-4 py-10 text-sm text-muted">
          {lane === "free" ? (
            <>
              Nessun free in chart. Compila il form sopra (login) — solo download gratis reali.
            </>
          ) : (
            <>
              Nessun dig in chart ancora. Premi ♥ / Salva in wishlist — più utenti la salvano, più
              sale qui. Guest: wishlist locale; login: cronologia cloud.
            </>
          )}
        </p>
      ) : (
        <ChartTable tracks={tracks} />
      )}
    </div>
  );
}
