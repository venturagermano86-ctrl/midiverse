import Link from "next/link";
import { AddToCollectionButton } from "@/components/AddToCollectionButton";
import { CoverArt } from "@/components/CoverArt";
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
  const hasVinyl = vinylOffers(track.offers).length > 0;

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
            <span className="absolute left-2 top-2 bg-signal px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-ink">
              Free
            </span>
          ) : null}
        </div>
        <div className="mt-3 space-y-1">
          <p className="truncate font-display text-sm font-semibold text-mist group-hover:text-signal">
            {track.title}
          </p>
          <p className="truncate text-xs text-bandcamp/90">{track.artist}</p>
          <p className="text-[0.65rem] uppercase tracking-wider text-muted">
            {track.genre}
            {track.bpm ? ` · ${track.bpm}` : ""}
          </p>
          {best ? (
            <p className="pt-1 text-xs">
              <span className="font-semibold text-signal">{formatOfferPrice(best)}</span>
              <span className="text-muted">
                {" "}
                · {storeName(best.storeId)}
                {digi.length > 1 ? ` · ${digi.length}` : ""}
              </span>
            </p>
          ) : null}
        </div>
      </Link>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <AddToCollectionButton trackId={track.id} track={track} compact />
        {hasVinyl ? (
          <Link
            href={`/traccia/${track.id}?media=vinyl#buy`}
            className="rounded-dig border border-signal/40 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-signal hover:bg-signal hover:text-ink"
          >
            Vinyl
          </Link>
        ) : null}
      </div>
    </div>
  );
}
