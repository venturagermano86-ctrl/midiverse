"use client";

import Link from "next/link";
import { AddToCollectionButton } from "@/components/AddToCollectionButton";
import { CoverArt } from "@/components/CoverArt";
import { useCollection } from "@/components/CollectionProvider";
import { TrackCard } from "@/components/TrackCard";
import {
  cheapestOffer,
  formatPrice,
  getTrack,
} from "@/lib/catalog";
import { findSimilarToCollection } from "@/lib/engines/similar";
import { storeName } from "@/lib/stores";

export default function CollezionePage() {
  const { ids, clear, ready } = useCollection();
  const tracks = ids.map((id) => getTrack(id)).filter(Boolean);
  const similar = findSimilarToCollection(ids, 12);

  return (
    <main className="px-5 py-8 md:px-10 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-signal">
            Come Diggleist
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-mist md:text-4xl">
            La tua collezione
          </h1>
          <p className="mt-2 max-w-xl text-sm text-mist/50">
            Metti i dischi che ti piacciono. OVUNQUE ti trova i simili — come un Amazon della
            musica acquistabile (e free).
          </p>
        </div>
        {ready && ids.length > 0 ? (
          <button
            type="button"
            onClick={clear}
            className="text-xs font-semibold uppercase tracking-wider text-mist/40 transition hover:text-ember"
          >
            Svuota cassa
          </button>
        ) : null}
      </div>

      {!ready ? (
        <p className="mt-12 text-mist/40">Carico la cassa…</p>
      ) : tracks.length === 0 ? (
        <div className="mt-16 max-w-lg space-y-4">
          <p className="text-mist/60">
            Collezione vuota. Apri una traccia e premi{" "}
            <strong className="text-mist">Aggiungi alla collezione</strong>, oppure sfoglia il
            catalogo.
          </p>
          <Link
            href="/cerca"
            className="inline-flex rounded-sm bg-signal px-5 py-3 text-sm font-bold text-ink"
          >
            Esplora il catalogo
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-10 divide-y divide-white/10 border-y border-white/10">
            {tracks.map((track) => {
              if (!track) return null;
              const best = cheapestOffer(track);
              return (
                <li key={track.id} className="flex flex-wrap items-center gap-4 py-4">
                  <Link href={`/traccia/${track.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                    <CoverArt
                      hue={track.coverHue}
                      title={track.title}
                      className="h-16 w-16 shrink-0 rounded-sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-display font-semibold text-mist">{track.title}</p>
                      <p className="truncate text-sm text-mist/50">
                        {track.artist} · {track.genre}
                      </p>
                      {best ? (
                        <p className="mt-1 text-xs text-signal">
                          {formatPrice(best.priceEur, best.kind)} · {storeName(best.storeId)}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                  <AddToCollectionButton trackId={track.id} compact />
                </li>
              );
            })}
          </ul>

          <section className="mt-16 space-y-4">
            <h2 className="font-display text-2xl font-bold text-mist">
              Simili alla tua collezione
            </h2>
            <p className="text-sm text-mist/50">
              In base a genere, BPM, mood, label e artista — come quando Diggleist ti proponeva i
              dischi vicini.
            </p>
            {similar.length === 0 ? (
              <p className="text-mist/40">Aggiungi qualche traccia in più per affinare.</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 md:gap-5">
                {similar.map((hit, i) => (
                  <div key={hit.track.id} className="w-[11.5rem] shrink-0 sm:w-[13rem]">
                    <TrackCard track={hit.track} index={i} />
                    <p className="mt-2 line-clamp-2 text-[0.65rem] text-mist/40">
                      {hit.reasons.join(" · ")}
                    </p>
                    <div className="mt-2">
                      <AddToCollectionButton trackId={hit.track.id} compact />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
