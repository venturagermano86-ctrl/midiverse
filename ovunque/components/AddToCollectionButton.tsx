"use client";

import { useCollection } from "@/components/CollectionProvider";

type Props = {
  trackId: string;
  compact?: boolean;
};

export function AddToCollectionButton({ trackId, compact }: Props) {
  const { has, toggle, ready } = useCollection();
  const inCol = has(trackId);

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(trackId);
      }}
      className={
        compact
          ? `px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider transition ${
              inCol
                ? "bg-ember/20 text-ember"
                : "border border-line text-muted hover:border-signal hover:text-signal"
            }`
          : `px-5 py-3 text-sm font-bold transition ${
              inCol
                ? "border border-ember/40 bg-ember/15 text-ember"
                : "border border-line text-mist hover:border-signal hover:text-signal"
            }`
      }
    >
      {inCol ? (compact ? "In crate" : "In your crate ✓") : compact ? "+ Crate" : "Add to crate"}
    </button>
  );
}
