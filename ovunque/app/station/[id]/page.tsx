"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddToCollectionButton } from "@/components/AddToCollectionButton";
import { CoverArt } from "@/components/CoverArt";
import { RecordShelf } from "@/components/RecordShelf";
import { useWishlist } from "@/components/CollectionProvider";
import {
  digitalOffers,
  formatOfferPrice,
  getTrack,
} from "@/lib/catalog";
import { getBandcampUsername } from "@/lib/bandcampProfile";
import {
  getPlayingSrc,
  playPreview,
  setPlayQueue,
  stopPreview,
  subscribePreview,
  subscribePreviewEnded,
} from "@/lib/previewAudio";
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
  const { tracks: owned } = useWishlist();
  const [items, setItems] = useState<StationRow[]>([]);
  const [note, setNote] = useState("Avvio Station Diglist…");
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  const current = items[cursor]?.track ?? null;
  const ownedLen = owned.length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let seed: Track | null = getTrack(id) ?? null;
      try {
        const raw =
          localStorage.getItem(`dig.station.seed.${id}`) ||
          sessionStorage.getItem(`dig.station.seed.${id}`);
        if (raw) seed = JSON.parse(raw) as Track;
      } catch {
        /* ignore */
      }

      try {
        const res = await fetch(`/api/station/${encodeURIComponent(id)}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            track: seed,
            owned: owned.slice(0, 400),
            bandcampUser: getBandcampUsername() || undefined,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data.items)) {
          setItems(data.items);
          setNote(data.note || "Station · Diglist croce (stesso motore Short/Long)");
          setCursor(0);
          const q = (data.items as StationRow[])
            .map((row) => row.track)
            .filter((t) => t.previewUrl)
            .map((t) => ({
              id: t.id,
              title: t.title,
              artist: t.artist,
              previewUrl: t.previewUrl!,
              artworkUrl: t.artworkUrl,
            }));
          setPlayQueue(q, 0);
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
      stopPreview();
    };
    // ownedLen: evita loop su nuova ref array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ownedLen]);

  useEffect(() => {
    return subscribePreview((src, id) => {
      const cur = items[cursor]?.track;
      if (!cur) {
        setPlaying(false);
        return;
      }
      setPlaying(!!src && (id ? id === cur.id : src === cur.previewUrl));
    });
  }, [cursor, items]);

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
      const on = await playPreview(src, row.track.id, {
        title: row.track.title,
        artist: row.track.artist,
        artworkUrl: row.track.artworkUrl,
      });
      setPlaying(on);
    },
    [items],
  );

  // Auto-play first track when queue loads; advance on end via subscribe+ended in playPreview
  useEffect(() => {
    if (!items.length) return;
    const t = items[cursor];
    if (!t?.track.previewUrl) return;
    void playAt(cursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Fine preview → traccia successiva in coda
  useEffect(() => {
    return subscribePreviewEnded(() => {
      setCursor((c) => {
        const next = c + 1;
        if (next < items.length) {
          const row = items[next];
          const src = row?.track.previewUrl;
          if (src) void playPreview(src, row.track.id);
          return next;
        }
        return c;
      });
    });
  }, [items]);

  const digi = useMemo(
    () => (current ? digitalOffers(current.offers)[0] : null),
    [current],
  );

  function togglePlay() {
    const src = current?.previewUrl;
    if (!src) {
      void playAt(cursor);
      return;
    }
    if (playing && getPlayingSrc() === src) {
      stopPreview();
      setPlaying(false);
      return;
    }
    void playPreview(src, current?.id).then(setPlaying);
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
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,18rem)_1fr]">
          <div>
            <CoverArt
              hue={current.coverHue}
              title={current.title}
              artworkUrl={current.artworkUrl}
              className="aspect-square w-full border border-line"
            />
          </div>
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">
              Now · {cursor + 1}/{items.length}
            </p>
            <h2 className="mt-1 font-display text-2xl font-black text-mist">
              {current.title}
            </h2>
            <p className="text-soft">{current.artist}</p>
            {digi ? (
              <p className="mt-2 text-sm text-signal">
                {formatOfferPrice(digi)} · {storeName(digi.storeId)}
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
                disabled={cursor <= 0}
                onClick={() => void playAt(cursor - 1)}
                className="rounded-dig border border-line px-4 py-3 text-sm font-semibold text-mist hover:border-signal hover:text-signal disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={cursor >= items.length - 1}
                onClick={() => void playAt(cursor + 1)}
                className="rounded-dig border border-line px-4 py-3 text-sm font-semibold text-mist hover:border-signal hover:text-signal disabled:opacity-40"
              >
                Next
              </button>
              <AddToCollectionButton trackId={current.id} track={current} />
              <Link
                href={`/traccia/${current.id}`}
                className="rounded-dig border border-line px-4 py-3 text-sm font-semibold text-mist hover:border-signal hover:text-signal"
              >
                Track
              </Link>
            </div>

            <div className="mt-10">
              <h2 className="font-display text-xl font-black text-mist">
                Queue
              </h2>
              <ul className="mt-3 divide-y divide-line border border-line">
                {items.map((row, i) => (
                  <li key={`${row.track.id}-${i}`}>
                    <button
                      type="button"
                      onClick={() => void playAt(i)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-row ${
                        i === cursor ? "bg-row" : ""
                      }`}
                    >
                      <span className="w-6 font-display text-sm font-bold text-signal">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-mist">
                          {row.track.title}
                        </span>
                        <span className="block truncate text-xs text-soft">
                          {row.track.artist}
                        </span>
                      </div>
                      {row.track.previewUrl ? (
                        <span className="text-[0.65rem] font-bold uppercase text-signal">
                          ▶
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {shelfTracks.length > 0 ? (
        <div className="mt-12">
          <h2 className="mb-4 font-display text-xl font-black text-mist">
            Same wave
          </h2>
          <RecordShelf tracks={shelfTracks} />
        </div>
      ) : null}
    </main>
  );
}
