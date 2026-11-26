"use client";

import { useEffect, useState } from "react";
import {
  getPlayingId,
  getPlayingSrc,
  playPreview,
  subscribePreview,
} from "@/lib/previewAudio";

type Props = {
  src?: string | null;
  title?: string;
  /** Se manca src, risolvi preview da artist+title (consigliati / dig). */
  artist?: string;
  /** Id traccia — il ▶ attivo è solo su QUESTA cover. */
  trackId?: string;
};

const previewCache = new Map<string, string>();
const missCache = new Set<string>();

/** Player rapido 1-click — un solo audio globale; risolve preview se manca. */
export function QuickPlay({ src, title, artist, trackId }: Props) {
  const [resolved, setResolved] = useState<string | null>(src ?? null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [miss, setMiss] = useState(false);

  useEffect(() => {
    setResolved(src ?? null);
    setMiss(false);
  }, [src, trackId]);

  useEffect(() => {
    const current = resolved;
    return subscribePreview((s, id) => {
      if (trackId) {
        setPlaying(!!s && id === trackId);
        return;
      }
      setPlaying(!!current && s === current);
    });
  }, [resolved, trackId]);

  async function resolveSrc(): Promise<string | null> {
    if (resolved) return resolved;
    if (src) return src;
    if (!artist || !title) return null;
    const key = `${artist}::${title}`.toLowerCase();
    if (missCache.has(key)) {
      setMiss(true);
      return null;
    }
    const cached = previewCache.get(key);
    if (cached) {
      setResolved(cached);
      return cached;
    }
    setLoading(true);
    setMiss(false);
    try {
      const res = await fetch(
        `/api/live/preview?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`,
      );
      const data = await res.json();
      if (data.previewUrl) {
        previewCache.set(key, data.previewUrl as string);
        setResolved(data.previewUrl as string);
        return data.previewUrl as string;
      }
      missCache.add(key);
      setMiss(true);
    } catch {
      setMiss(true);
    } finally {
      setLoading(false);
    }
    return null;
  }

  const canTry = !!(resolved || src || (artist && title));

  if (!canTry) {
    return (
      <span
        className="inline-grid h-9 w-9 place-items-center rounded-full border border-line bg-ink/70 text-[0.65rem] text-muted"
        title="Nessuna preview"
      >
        —
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void (async () => {
          const url = await resolveSrc();
          if (!url) return;
          const on = await playPreview(url, trackId);
          if (trackId) {
            setPlaying(on || getPlayingId() === trackId);
          } else {
            setPlaying(on || getPlayingSrc() === url);
          }
        })();
      }}
      aria-label={playing ? `Stop ${title ?? ""}` : `Play ${title ?? ""}`}
      aria-pressed={playing}
      title={miss ? "Preview non trovata" : playing ? "Stop" : "Play"}
      className={`inline-grid h-9 w-9 place-items-center rounded-full text-sm font-black shadow-md transition ${
        playing
          ? "bg-signal text-ink"
          : miss
            ? "border border-line bg-ink/70 text-muted"
            : "border border-signal/60 bg-ink/75 text-signal hover:bg-signal hover:text-ink"
      } ${loading ? "opacity-60" : ""}`}
    >
      {loading ? "…" : playing ? "■" : "▶"}
    </button>
  );
}
