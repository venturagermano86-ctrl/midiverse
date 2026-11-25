"use client";

import { useEffect, useRef, useState } from "react";
import { claimPreview, releasePreview } from "@/lib/previewAudio";

type Props = {
  src?: string | null;
  title?: string;
};

/** Player rapido 1-click — apre uno, chiude gli altri. */
export function QuickPlay({ src, title }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      stopRef.current?.();
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

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

  function ensureAudio(): HTMLAudioElement {
    if (!audioRef.current) {
      const a = new Audio(src!);
      a.preload = "none";
      a.addEventListener("ended", () => {
        setPlaying(false);
        if (stopRef.current) releasePreview(stopRef.current);
      });
      audioRef.current = a;
    }
    return audioRef.current;
  }

  function stopSelf() {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setPlaying(false);
    if (stopRef.current) releasePreview(stopRef.current);
  }

  async function toggle() {
    const a = ensureAudio();

    if (playing) {
      stopSelf();
      return;
    }

    const stop = () => {
      a.pause();
      a.currentTime = 0;
      setPlaying(false);
    };
    stopRef.current = stop;
    claimPreview(stop);

    try {
      await a.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      releasePreview(stop);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
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
