"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src?: string | null;
  title?: string;
};

/** Player rapido 1-click per le chart / shelf. */
export function QuickPlay({ src, title }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
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

  async function toggle() {
    if (!audioRef.current) {
      audioRef.current = new Audio(src!);
      audioRef.current.preload = "none";
      audioRef.current.addEventListener("ended", () => setPlaying(false));
      audioRef.current.addEventListener("pause", () => setPlaying(false));
    }
    const a = audioRef.current;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    // ferma altri player sulla pagina
    document.querySelectorAll("audio[data-dig-quick]").forEach((el) => {
      (el as HTMLAudioElement).pause();
    });
    try {
      await a.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  return (
    <>
      <audio data-dig-quick src={src} preload="none" className="hidden" />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void toggle();
        }}
        aria-label={playing ? `Stop ${title ?? ""}` : `Play ${title ?? ""}`}
        className={`inline-grid h-9 w-9 place-items-center rounded-full text-sm font-black transition ${
          playing
            ? "bg-signal text-ink"
            : "border border-signal/50 text-signal hover:bg-signal hover:text-ink"
        }`}
      >
        {playing ? "■" : "▶"}
      </button>
    </>
  );
}
