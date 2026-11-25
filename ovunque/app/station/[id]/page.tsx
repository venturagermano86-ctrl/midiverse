"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddToCollectionButton } from "@/components/AddToCollectionButton";
import { CoverArt } from "@/components/CoverArt";
import { RecordShelf } from "@/components/RecordShelf";
import {
  digitalOffers,
  formatOfferPrice,
  getTrack,
} from "@/lib/catalog";
import { storeName } from "@/lib/stores";
import type { Track } from "@/lib/types";

type StationRow = {
  index: number;
  reason: string;
  track: Track;
};

export default function StationPage() {
  const params = useParams();
  const id = decodeURIComponent(String(params.id ?? ""));
  const [items, setItems] = useState<StationRow[]>([]);
  const [note, setNote] = useState("Avvio Station…");
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = items[cursor]?.track ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let seed: Track | null = getTrack(id) ?? null;
      try {
        const raw = sessionStorage.getItem(`dig.station.seed.${id}`);
        if (raw) seed = JSON.parse(raw) as Track;
      } catch {
        /* ignore */
      }

      try {
        const res = await fetch(`/api/station/${encodeURIComponent(id)}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ track: seed }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data.items)) {
          setItems(data.items);
          setNote(data.note || "Station · dischi molto simili");
          setCursor(0);
        } else {
          setNote("Station non disponibile per questa traccia.");
        }
      } catch {
        if (!cancelled) setNote("Station offline.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, [id]);

  const playAt = useCallback(
    async (index: number) => {
      const row = items[index];
      if (!row) return;
      setCursor(index);
      const src = row.track.previewUrl;
      if (!src) {
        setPlaying(false);
        return;
      }
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.addEventListener("ended", () => {
          setCursor((c) => {
            const next = c + 1;
            return next < items.length ? next : c;
          });
        });
      }
      const a = audioRef.current;
      a.src = src;
      try {
        await a.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    },
    [items],
  );

  // Auto-play next when cursor advances on ended
  useEffect(() => {
    if (!items.length) return;
    const t = items[cursor];
    if (!t?.track.previewUrl) return;
    void playAt(cursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, items.length]);

  const digi = useMemo(
    () => (current ? digitalOffers(current.offers)[0] : null),
    [current],
  );

  function togglePlay() {
    const a = audioRef.current;
    if (!a || !current?.previewUrl) {
      void playAt(cursor);
      return;
    }
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  const shelfTracks = items.map((i) => i.track);

  return (
    <main className="px-4 py-8 md:px-8 md:py-10">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
        Station · Dig List style
      </p>
      <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-mist md:text-4xl">
        Station
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-soft">
        {note} — selezioni una traccia, qui trovi la lista di dischi molto simili.
      </p>

      {loading ? (
        <p className="mt-10 text-muted">Carico la coda…</p>
      ) : !current ? (
        <p className="mt-10 text-muted">Nessuna traccia in Station.</p>
      ) : (
        <>
          <section className="mt-8 grid gap-6 rounded-dig-lg border border-line bg-panel p-5 md:grid-cols-[10rem_1fr] md:p-6">
            <CoverArt
              hue={current.coverHue}
              title={current.title}
              artworkUrl={current.artworkUrl}
              className="aspect-square w-full border border-line"
            />
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">
                Now playing · {cursor + 1}/{items.length}
              </p>
              <h2 className="mt-1 font-display text-2xl font-black text-mist">
                {current.title}
              </h2>
              <p className="mt-1 text-lg text-bandcamp">{current.artist}</p>
              <p className="mt-1 text-xs text-soft">
                {items[cursor]?.reason} · {current.genre}
              </p>
              {digi ? (
                <p className="mt-2 text-sm text-signal">
                  Digi {formatOfferPrice(digi)} · {storeName(digi.storeId)}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="rounded-dig bg-signal px-5 py-3 text-sm font-bold text-ink hover:bg-signal-hi"
                >
                  {playing ? "Pause" : current.previewUrl ? "Play" : "No preview"}
                </button>
                <button
                  type="button"
                  onClick={() => void playAt(Math.min(cursor + 1, items.length - 1))}
                  className="rounded-dig border border-line px-4 py-3 text-sm font-semibold text-mist hover:border-signal hover:text-signal"
                >
                  Next →
                </button>
                <Link
                  href={`/traccia/${current.id}`}
                  className="rounded-dig border border-line px-4 py-3 text-sm font-semibold text-mist hover:border-signal hover:text-signal"
                >
                  Open track
                </Link>
                <AddToCollectionButton trackId={current.id} track={current} />
              </div>
            </div>
          </section>

          <section className="mt-12">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
              <div>
                <h2 className="font-display text-xl font-black text-mist">
                  Similar digs
                </h2>
                <p className="mt-1 text-sm text-soft">
                  Lista tipo Dig List — cover una accanto all’altra
                </p>
              </div>
              <p className="text-xs text-muted">{items.length} records</p>
            </div>
            <RecordShelf tracks={shelfTracks} />
          </section>

          <ol className="mt-12 divide-y divide-line border-y border-line">
            {items.map((row, i) => (
              <li key={row.track.id}>
                <button
                  type="button"
                  onClick={() => void playAt(i)}
                  className={`flex w-full items-center gap-3 px-1 py-3 text-left transition hover:bg-row ${
                    i === cursor ? "bg-signal/10" : ""
                  }`}
                >
                  <span className="w-6 font-display text-sm font-bold text-signal">
                    {i + 1}
                  </span>
                  <CoverArt
                    hue={row.track.coverHue}
                    title={row.track.title}
                    artworkUrl={row.track.artworkUrl}
                    className="h-10 w-10 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-mist">
                      {row.track.title}
                    </span>
                    <span className="block truncate text-xs text-soft">
                      {row.track.artist} · {row.reason}
                    </span>
                  </span>
                  {i === cursor && playing ? (
                    <span className="text-[0.65rem] font-bold uppercase text-signal">
                      Playing
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}
