"use client";

import { useCollection } from "@/components/CollectionProvider";
import type { Track } from "@/lib/types";

type Props = {
  trackId: string;
  /** Passa la traccia intera così finisce in wishlist anche se è live iTunes. */
  track?: Track;
  compact?: boolean;
};

export function AddToCollectionButton({ trackId, track, compact }: Props) {
  const { has, toggle, ready } = useCollection();
  const inWish = has(trackId);

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(track ?? trackId);
      }}
      className={
        compact
          ? `rounded-dig px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider transition ${
              inWish
                ? "bg-ember/20 text-ember"
                : "border border-line text-muted hover:border-signal hover:text-signal"
            }`
          : `rounded-dig px-5 py-3 text-sm font-bold transition ${
              inWish
                ? "border border-ember/40 bg-ember/15 text-ember"
                : "border border-line text-mist hover:border-signal hover:text-signal"
            }`
      }
    >
      {inWish
        ? compact
          ? "Wishlist ✓"
          : "In wishlist ✓"
        : compact
          ? "+ Wishlist"
          : "Salva in wishlist"}
    </button>
  );
}
