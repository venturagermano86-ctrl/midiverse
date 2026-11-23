import Link from "next/link";
import { CoverArt } from "@/components/CoverArt";
import { cheapestOffer, formatPrice } from "@/lib/catalog";
import { storeName } from "@/lib/stores";
import type { Track } from "@/lib/types";

type Props = {
  track: Track;
  index?: number;
};

export function TrackCard({ track, index = 0 }: Props) {
  const best = cheapestOffer(track);
  const multi = track.offers.length > 1;

  return (
    <Link
      href={`/traccia/${track.id}`}
      className="group block w-[11.5rem] shrink-0 animate-rise sm:w-[13rem]"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <CoverArt
        hue={track.coverHue}
        title={track.title}
        className="aspect-square w-full rounded-sm transition duration-500 group-hover:scale-[1.02] group-hover:brightness-110"
      />
      <div className="mt-3 space-y-1">
        <p className="truncate font-display text-sm font-semibold text-mist group-hover:text-white">
          {track.title}
        </p>
        <p className="truncate text-xs text-mist/55">{track.artist}</p>
        <p className="pt-1 text-xs">
          <span className="font-semibold text-signal">{formatPrice(best.priceEur)}</span>
          <span className="text-mist/40"> · </span>
          <span className="text-mist/55">
            {multi
              ? `da ${storeName(best.storeId)} · ${track.offers.length} portali`
              : `solo ${storeName(best.storeId)}`}
          </span>
        </p>
      </div>
    </Link>
  );
}
