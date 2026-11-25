"use client";

import Link from "next/link";
import { HeartWish } from "@/components/HeartWish";
import { QuickPlay } from "@/components/QuickPlay";
import { StationButton } from "@/components/StationButton";
import { digitalOffers, formatOfferPrice, vinylOffers } from "@/lib/catalog";
import type { Track } from "@/lib/types";

type Props = {
  tracks: Track[];
  showPrice?: boolean;
};

function Centrino({ track }: { track: Track }) {
  const hue = track.coverHue % 360;
  if (track.artworkUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={track.artworkUrl}
        alt=""
        className="aspect-square w-full object-cover"
      />
    );
  }

  return (
    <div
      className="relative aspect-square w-full overflow-hidden"
      style={{
        background: `radial-gradient(circle at 50% 50%,
          hsl(${hue} 35% 18%) 0%,
          hsl(${hue} 40% 12%) 38%,
          #0a0a0a 39%,
          #0a0a0a 42%,
          hsl(${(hue + 40) % 360} 28% 22%) 43%,
          hsl(${hue} 30% 14%) 70%,
          #050505 100%)`,
      }}
      aria-hidden
    >
      <div className="absolute inset-[28%] rounded-full border border-white/10 bg-ink/40" />
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-1 ring-white/25" />
      <div className="absolute inset-x-3 bottom-3 truncate text-center font-display text-[0.55rem] font-bold uppercase tracking-[0.14em] text-white/55">
        {track.title}
      </div>
    </div>
  );
}

export function RecordShelf({ tracks, showPrice = true }: Props) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
      {tracks.map((track) => {
        const digi = digitalOffers(track.offers)[0];
        const hasVinyl = vinylOffers(track.offers).length > 0;
        return (
          <li key={track.id} className="group min-w-0">
            <div className="relative overflow-hidden border border-line bg-panel transition group-hover:border-signal/45">
              <Link href={`/traccia/${track.id}`} className="block">
                <Centrino track={track} />
              </Link>
              <div className="absolute left-2 top-2 z-10">
                <HeartWish track={track} />
              </div>
              <div className="absolute bottom-2 right-2 z-10 drop-shadow-md">
                <QuickPlay
                  src={track.previewUrl}
                  title={track.title}
                  artist={track.artist}
                />
              </div>
            </div>
            <Link href={`/traccia/${track.id}`} className="block">
              <p className="mt-2.5 truncate font-display text-sm font-bold text-mist group-hover:text-signal">
                {track.title}
              </p>
              <p className="truncate text-xs text-soft">{track.artist}</p>
              {showPrice && digi ? (
                <p className="mt-1 truncate text-[0.7rem] text-signal">
                  Digi {formatOfferPrice(digi)}
                  {hasVinyl ? " · 12\"" : ""}
                </p>
              ) : null}
            </Link>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StationButton track={track} compact />
              {hasVinyl ? (
                <Link
                  href={`/traccia/${track.id}?media=vinyl#buy`}
                  className="rounded-dig border border-line px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted hover:border-signal hover:text-signal"
                >
                  12&quot;
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
