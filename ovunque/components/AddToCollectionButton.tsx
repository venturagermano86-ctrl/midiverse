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
          ? `rounded-sm px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider transition ${
              inCol
                ? "bg-ember/20 text-ember"
                : "border border-white/15 text-mist/70 hover:border-signal/50 hover:text-signal"
            }`
          : `rounded-sm px-5 py-3 text-sm font-bold transition ${
              inCol
                ? "border border-ember/40 bg-ember/15 text-ember"
                : "border border-white/20 text-mist hover:border-signal/60 hover:text-signal"
            }`
      }
    >
      {inCol ? (compact ? "In cassa" : "Nella collezione ✓") : compact ? "Aggiungi" : "Aggiungi alla collezione"}
    </button>
  );
}
