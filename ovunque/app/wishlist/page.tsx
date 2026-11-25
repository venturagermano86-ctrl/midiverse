"use client";

import Link from "next/link";
import { useWishlist } from "@/components/CollectionProvider";
import { PickShelf } from "@/components/PickShelf";

export default function WishlistPage() {
  const { tracks, clear, ready, count } = useWishlist();

  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
          Dig List style
        </p>
        {ready && count > 0 ? (
          <button
            type="button"
            onClick={clear}
            className="text-xs font-semibold uppercase tracking-wider text-muted transition hover:text-ember"
          >
            Clear shelf
          </button>
        ) : null}
      </div>

      {!ready ? (
        <p className="mt-12 text-muted">Loading shelf…</p>
      ) : tracks.length === 0 ? (
        <div className="mt-16 max-w-lg space-y-4">
          <h1 className="font-display text-3xl font-black text-mist">Your records</h1>
          <p className="text-soft">
            Empty. Salva tracce con <strong className="text-mist">+ Wishlist</strong>, poi
            seleziona fino a 6 e lancia Short / Long list — si apre in una scheda nuova.
          </p>
          <Link
            href="/cerca"
            className="inline-flex rounded-dig bg-signal px-5 py-3 text-sm font-bold text-ink"
          >
            Search tracks
          </Link>
        </div>
      ) : (
        <PickShelf tracks={tracks} openInNewTab />
      )}
    </main>
  );
}
