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
};

/** Player rapido 1-click — un solo audio globale, mai sovrapposti. */
export function QuickPlay({ src, title }: Props) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!src) return;
    return subscribePreview((current) => {
      setPlaying(current === src);
    });
  }, [src]);

  if (!src) {
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
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void playPreview(src).then((on) => setPlaying(on || getPlayingSrc() === src));
      }}
      aria-label={playing ? `Stop ${title ?? ""}` : `Play ${title ?? ""}`}
      aria-pressed={playing}
      className={`inline-grid h-9 w-9 place-items-center rounded-full text-sm font-black transition ${
        playing
          ? "bg-signal text-ink"
          : "border border-signal/50 text-signal hover:bg-signal hover:text-ink"
      }`}
    >
      {playing ? "■" : "▶"}
    </button>
  );
}
