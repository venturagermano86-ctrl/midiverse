"use client";

import Link from "next/link";
import { AddToCollectionButton } from "@/components/AddToCollectionButton";
import { CoverArt } from "@/components/CoverArt";
import { useWishlist } from "@/components/CollectionProvider";
import {
  digitalOffers,
  formatOfferPrice,
  vinylOffers,
} from "@/lib/catalog";
import { storeName } from "@/lib/stores";

export default function WishlistPage() {
  const { tracks, clear, ready, count } = useWishlist();

  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
            Ascolta · salva · compra
          </p>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-mist md:text-4xl">
            Wishlist
          </h1>
          <p className="mt-2 max-w-xl text-sm text-soft">
            Tutto ciò che salvi da charts, search o pagina traccia arriva qui — poi apri e
            scegli Digital o Vinyl.
          </p>
        </div>
        {ready && count > 0 ? (
          <button
            type="button"
            onClick={clear}
            className="text-xs font-semibold uppercase tracking-wider text-muted transition hover:text-ember"
          >
            Svuota wishlist
          </button>
        ) : null}
      </div>

      {!ready ? (
        <p className="mt-12 text-muted">Carico wishlist…</p>
      ) : tracks.length === 0 ? (
        <div className="mt-16 max-w-lg space-y-4">
          <p className="text-soft">
            Wishlist vuota. Premi <strong className="text-mist">Salva in wishlist</strong> su
            una traccia — anche live — e riappare qui.
          </p>
          <Link
            href="/cerca"
            className="inline-flex rounded-dig bg-signal px-5 py-3 text-sm font-bold text-ink"
          >
            Cerca tracce
          </Link>
        </div>
      ) : (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {tracks.map((track) => {
            const digi = digitalOffers(track.offers)[0];
            const hasVinyl = vinylOffers(track.offers).length > 0;
            return (
              <li key={track.id} className="flex flex-wrap items-center gap-4 py-4">
                <Link
                  href={`/traccia/${track.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                  <CoverArt
                    hue={track.coverHue}
                    title={track.title}
                    artworkUrl={track.artworkUrl}
                    className="h-16 w-16 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-display font-semibold text-mist">
                      {track.title}
                    </p>
                    <p className="truncate text-sm text-soft">
                      {track.artist} · {track.genre}
                    </p>
                    {digi ? (
                      <p className="mt-1 text-xs text-signal">
                        Digital {formatOfferPrice(digi)} · {storeName(digi.storeId)}
                      </p>
                    ) : null}
                  </div>
                </Link>
                {hasVinyl ? (
                  <Link
                    href={`/traccia/${track.id}?media=vinyl#buy`}
                    className="rounded-dig border border-signal/40 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-signal hover:bg-signal hover:text-ink"
                  >
                    Vinyl →
                  </Link>
                ) : null}
                <Link
                  href={`/traccia/${track.id}#buy`}
                  className="rounded-dig bg-signal px-4 py-2 text-sm font-bold text-ink"
                >
                  Compra
                </Link>
                <AddToCollectionButton trackId={track.id} track={track} compact />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
