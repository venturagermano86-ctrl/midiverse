"use client";

import { useEffect, useState } from "react";
import {
  getPlayingSrc,
  playPreview,
  subscribePreview,
} from "@/lib/previewAudio";

type Props = {
  src?: string | null;
  title?: string;
  /** Se manca src, risolvi preview da artist+title (consigliati). */
  artist?: string;
};

const previewCache = new Map<string, string>();

/** Player rapido 1-click — un solo audio globale; risolve preview se manca. */
export function QuickPlay({ src, title, artist }: Props) {
  const [resolved, setResolved] = useState<string | null>(src ?? null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setResolved(src ?? null);
  }, [src]);

  useEffect(() => {
    const current = resolved;
    if (!current) {
      setPlaying(false);
      return;
    }
    return subscribePreview((s) => setPlaying(s === current));
  }, [resolved]);

  async function resolveSrc(): Promise<string | null> {
    if (resolved) return resolved;
    if (src) return src;
    if (!artist || !title) return null;
    const key = `${artist}::${title}`.toLowerCase();
    const cached = previewCache.get(key);
    if (cached) {
      setResolved(cached);
      return cached;
    }
    setLoading(true);
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
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
    return null;
  }

  const canTry = !!(resolved || src || (artist && title));

  if (!canTry) {
    return (
      <span
        className="inline-grid h-9 w-9 place-items-center rounded-full border border-line text-[0.65rem] text-muted"
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
          const on = await playPreview(url);
          setPlaying(on || getPlayingSrc() === url);
        })();
      }}
      aria-label={playing ? `Stop ${title ?? ""}` : `Play ${title ?? ""}`}
      aria-pressed={playing}
      className={`inline-grid h-9 w-9 place-items-center rounded-full text-sm font-black transition ${
        playing
          ? "bg-signal text-ink"
          : "border border-signal/50 text-signal hover:bg-signal hover:text-ink"
      } ${loading ? "opacity-60" : ""}`}
    >
      {loading ? "…" : playing ? "■" : "▶"}
    </button>
  );
}
