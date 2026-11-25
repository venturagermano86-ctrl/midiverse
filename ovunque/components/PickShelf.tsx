"use client";

import { useMemo, useState } from "react";
import { CoverArt } from "@/components/CoverArt";
import { HeartWish } from "@/components/HeartWish";
import { QuickPlay } from "@/components/QuickPlay";
import { encodeSeedsParam, stashDigPicks } from "@/lib/digPickBag";
import type { Track } from "@/lib/types";

const MAX_PICKS = 6;

type Props = {
  tracks: Track[];
  /** Se true, apre short/long in nuova scheda browser. */
  openInNewTab?: boolean;
};

function Centrino({ track }: { track: Track }) {
  if (track.artworkUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={track.artworkUrl} alt="" className="aspect-square w-full object-cover" />
    );
  }
  return (
    <CoverArt
      hue={track.coverHue}
      title={track.title}
      className="aspect-square w-full"
    />
  );
}

export function PickShelf({ tracks, openInNewTab = true }: Props) {
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState<"short" | "long" | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tracks;
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(term) ||
        t.artist.toLowerCase().includes(term) ||
        t.label.toLowerCase().includes(term),
    );
  }, [tracks, q]);

  const pickedTracks = useMemo(
    () =>
      picked
        .map((id) => tracks.find((t) => t.id === id))
        .filter((t): t is Track => t != null),
    [picked, tracks],
  );

  function toggle(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PICKS) return prev;
      return [...prev, id];
    });
  }

  async function runDig(mode: "short" | "long") {
    if (pickedTracks.length === 0) return;
    setBusy(mode);
    try {
      // localStorage + seeds in URL (scheda nuova / privacy browser)
      const bag = stashDigPicks(mode, pickedTracks);
      const seedsParam = encodeSeedsParam(mode, pickedTracks);
      const url = `/diglist?mode=${mode}&bag=${encodeURIComponent(bag)}&seeds=${encodeURIComponent(seedsParam)}`;
      if (openInNewTab) {
        // senza noopener: stessa origine + storage; seeds restano comunque in URL
        window.open(url, "_blank");
      } else {
        window.location.href = url;
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pb-28">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 className="font-display text-2xl font-black text-mist">Your records</h2>
          <p className="mt-1 text-sm text-soft">
            {tracks.length} records. Tap up to {MAX_PICKS}.
          </p>
        </div>
        <label className="block w-full max-w-xs">
          <span className="sr-only">Find a record</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a record or artist"
            className="w-full rounded-dig border border-line bg-panel px-3 py-2.5 text-sm text-mist outline-none placeholder:text-muted focus:border-signal/60"
          />
        </label>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filtered.map((track) => {
          const idx = picked.indexOf(track.id);
          const on = idx >= 0;
          return (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => toggle(track.id)}
                className="group w-full text-left"
              >
                <div
                  className={`relative overflow-hidden border transition ${
                    on
                      ? "border-signal ring-2 ring-signal"
                      : "border-line group-hover:border-signal/40"
                  }`}
                >
                  <Centrino track={track} />
                  {on ? (
                    <span className="absolute right-2 top-2 z-10 inline-grid h-7 w-7 place-items-center rounded-full bg-signal font-display text-sm font-black text-ink">
                      {idx + 1}
                    </span>
                  ) : null}
                  <div
                    className="absolute left-2 top-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <HeartWish track={track} />
                  </div>
                  <div
                    className="absolute bottom-2 right-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <QuickPlay
                      src={track.previewUrl}
                      title={track.title}
                      artist={track.artist}
                    />
                  </div>
                </div>
                <p className="mt-2.5 truncate font-display text-sm font-bold text-mist">
                  {track.title}
                </p>
                <p className="truncate text-xs text-soft">{track.artist}</p>
              </button>
            </li>
          );
        })}
      </ul>

      {picked.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur-md md:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {pickedTracks.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    className="h-9 w-9 overflow-hidden rounded-full border border-ink ring-1 ring-signal"
                  >
                    <Centrino track={t} />
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold text-mist">
                <span className="inline-grid h-6 min-w-6 place-items-center rounded-full bg-signal px-1.5 text-xs font-black text-ink">
                  {picked.length}
                </span>
                <span className="ml-2 text-soft">/{MAX_PICKS} picked</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void runDig("short")}
                className="rounded-dig border border-line bg-row px-4 py-2.5 text-left transition hover:border-signal disabled:opacity-50"
              >
                <strong className="block text-sm font-bold text-mist">Short list</strong>
                <span className="text-[0.7rem] text-muted">A few minutes</span>
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void runDig("long")}
                className="rounded-dig bg-signal px-4 py-2.5 text-left text-ink transition hover:bg-signal-hi disabled:opacity-50"
              >
                <strong className="block text-sm font-bold">Long list</strong>
                <span className="text-[0.7rem] opacity-80">More records, ~10 min</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
