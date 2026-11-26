"use client";

import Link from "next/link";
import { CoverArt } from "@/components/CoverArt";
import { HeartWish } from "@/components/HeartWish";
import { QuickPlay } from "@/components/QuickPlay";
import { StationButton } from "@/components/StationButton";
import { digitalOffers, formatOfferPrice, hasFreeOffer, vinylOffers } from "@/lib/catalog";
import { storeName } from "@/lib/stores";
import type { Track } from "@/lib/types";

type Props = {
  track: Track;
  index?: number;
};

export function TrackCard({ track, index = 0 }: Props) {
  const digi = digitalOffers(track.offers);
  const best = digi[0];
  if (!best && digi.length === 0) return null;
  const free = hasFreeOffer(track);
  const bestVinyl = vinylOffers(track.offers)[0];

  return (
    <div
      className="w-[11.5rem] shrink-0 animate-rise sm:w-[13rem]"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <Link href={`/traccia/${track.id}`} className="group block">
        <div className="relative border border-line">
          <CoverArt
            hue={track.coverHue}
            title={track.title}
            artworkUrl={track.artworkUrl}
            className="aspect-square w-full transition duration-400 group-hover:brightness-110"
          />
          {free ? (
            <span className="absolute left-2 top-2 z-[5] bg-signal px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-ink">
              Free
            </span>
          ) : (
            <div className="absolute left-2 top-2 z-10" onClick={(e) => e.preventDefault()}>
              <HeartWish track={track} />
            </div>
          )}
          {free ? (
            <div className="absolute right-2 top-2 z-10" onClick={(e) => e.preventDefault()}>
              <HeartWish track={track} />
            </div>
          ) : null}
          <div className="absolute bottom-2 right-2 z-10" onClick={(e) => e.preventDefault()}>
            <QuickPlay
              src={track.previewUrl}
              title={track.title}
              artist={track.artist}
              trackId={track.id}
            />
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <p className="truncate font-display text-sm font-semibold text-mist group-hover:text-signal">
            {track.title}
          </p>
          <p className="truncate text-xs text-bandcamp/90">{track.artist}</p>
          {best ? (
            <p className="pt-1 text-xs">
              <span className="font-semibold text-signal">{formatOfferPrice(best)}</span>
              <span className="text-muted"> · {storeName(best.storeId)}</span>
            </p>
          ) : null}
          {bestVinyl && bestVinyl.priceEur != null ? (
            <p className="text-[0.65rem] text-soft">
              12&quot; {formatOfferPrice(bestVinyl)}
            </p>
          ) : null}
        </div>
      </Link>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <StationButton track={track} compact />
      </div>
    </div>
  );
}
