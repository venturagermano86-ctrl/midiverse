"use client";

import { useCollection } from "@/components/CollectionProvider";
import type { Track } from "@/lib/types";

type Props = {
  track: Track;
  className?: string;
  /** Dopo cuore on/off — es. DigStart aggiunge ai seed Short/Long/Station. */
  onAfterToggle?: (track: Track, wishlisted: boolean) => void;
};

/** Cuore sulla cover → wishlist. */
export function HeartWish({ track, className = "", onAfterToggle }: Props) {
  const { has, toggle, ready } = useCollection();
  const on = has(track.id);

  return (
    <button
      type="button"
      disabled={!ready}
      title={on ? "Togli dalla wishlist" : "Salva in wishlist"}
      aria-label={on ? "Togli dalla wishlist" : "Salva in wishlist"}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = !on;
        toggle(track);
        onAfterToggle?.(track, next);
      }}
      className={`inline-grid h-9 w-9 place-items-center rounded-full text-base transition ${
        on
          ? "bg-signal text-ink"
          : "border border-white/30 bg-ink/55 text-mist backdrop-blur-sm hover:border-signal hover:text-signal"
      } ${className}`}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
