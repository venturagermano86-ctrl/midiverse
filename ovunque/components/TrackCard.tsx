import Link from "next/link";
import { CoverArt } from "@/components/CoverArt";
import { cheapestOffer, formatPrice, hasFreeOffer } from "@/lib/catalog";
import { storeName } from "@/lib/stores";
import type { Track } from "@/lib/types";

type Props = {
  track: Track;
  index?: number;
};

export function TrackCard({ track, index = 0 }: Props) {
  const best = cheapestOffer(track);
  if (!best) return null;
  const multi = track.offers.length > 1;
  const free = hasFreeOffer(track);

  return (
    <Link
      href={`/traccia/${track.id}`}
      className="group block w-[11.5rem] shrink-0 animate-rise sm:w-[13rem]"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="relative">
        <CoverArt
          hue={track.coverHue}
          title={track.title}
          className="aspect-square w-full rounded-sm transition duration-500 group-hover:scale-[1.02] group-hover:brightness-110"
        />
        {free && (
          <span className="absolute left-2 top-2 rounded-sm bg-signal px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-ink">
            Free
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <p className="truncate font-display text-sm font-semibold text-mist group-hover:text-white">
          {track.title}
        </p>
        <p className="truncate text-xs text-mist/55">{track.artist}</p>
        <p className="pt-1 text-xs">
          <span className={`font-semibold ${free ? "text-signal" : "text-signal"}`}>
            {formatPrice(best.priceEur, best.kind)}
          </span>
          <span className="text-mist/40"> · </span>
          <span className="text-mist/55">
            {free
              ? `su ${storeName(best.storeId)}`
              : multi
                ? `da ${storeName(best.storeId)} · ${track.offers.length} portali`
                : `solo ${storeName(best.storeId)}`}
          </span>
        </p>
      </div>
    </Link>
  );
}
