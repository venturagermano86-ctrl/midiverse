"use client";

import { useEffect, useState } from "react";
import {
  getPlayingSrc,
  playPreview,
  subscribePreview,
} from "@/lib/previewAudio";

type Props = {
  src: string;
  className?: string;
  title?: string;
  artist?: string;
  trackId?: string;
};

/**
 * Preview sulla pagina traccia → stesso player globale (barra scrub in basso).
 */
export function ExclusiveAudio({
  src,
  className = "",
  title,
  artist,
  trackId,
}: Props) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return subscribePreview((s, id) => {
      if (trackId) {
        setPlaying(!!s && id === trackId);
        return;
      }
      setPlaying(!!s && s === src);
    });
  }, [src, trackId]);

  return (
    <button
      type="button"
      onClick={() => {
        void playPreview(src, trackId, { title, artist }).then((on) => {
          setPlaying(on || getPlayingSrc() === src);
        });
      }}
      className={`inline-flex items-center gap-2 rounded-dig border border-signal/50 bg-panel px-4 py-3 text-sm font-bold text-signal hover:bg-signal hover:text-ink ${className}`}
    >
      {playing ? "❚❚ Pausa" : "▶ Ascolta preview"}
      <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted">
        scrub in basso
      </span>
    </button>
  );
}
