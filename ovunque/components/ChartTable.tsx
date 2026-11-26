"use client";

import Link from "next/link";
import { CoverArt } from "@/components/CoverArt";
import { HeartWish } from "@/components/HeartWish";
import { QuickPlay } from "@/components/QuickPlay";
import { StationButton } from "@/components/StationButton";
import {
  digitalOffers,
  formatOfferPrice,
  formatVinylBreakdown,
  hasFreeOffer,
  vinylOffers,
} from "@/lib/catalog";
import { storeName } from "@/lib/stores";
import type { Track } from "@/lib/types";

type Props = {
  tracks: Track[];
  showRank?: boolean;
};

/**
 * Chart stile deejay.de: digi + 12" misti con prezzi.
 * Player rapido al posto del bottone «VINYL →» inutile.
 */
export function ChartTable({ tracks, showRank = true }: Props) {
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[780px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-panel text-[0.65rem] uppercase tracking-[0.16em] text-muted">
            {showRank ? <th className="w-10 px-2 py-3 font-semibold">#</th> : null}
            <th className="px-3 py-3 font-semibold">Artist / Title</th>
            <th className="hidden px-3 py-3 font-semibold md:table-cell">Label</th>
            <th className="px-3 py-3 font-semibold text-right">Digi</th>
            <th className="px-3 py-3 font-semibold text-right">12&quot;</th>
            <th className="w-24 px-2 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, i) => {
            const digi = digitalOffers(track.offers);
            const vinyl = vinylOffers(track.offers);
            const bestDigi = digi[0] ?? null;
            const bestVinyl = vinyl[0] ?? null;
            if (!bestDigi && !bestVinyl) return null;
            const free = hasFreeOffer(track);
            const vinylBreak = bestVinyl ? formatVinylBreakdown(bestVinyl) : null;

            return (
              <tr key={track.id} className="chart-row border-b border-line/80 bg-row">
                {showRank ? (
                  <td className="px-2 py-3 font-display text-sm font-bold text-signal">
                    {i + 1}
                  </td>
                ) : null}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-line">
                      <Link href={`/traccia/${track.id}`} className="block">
                        <CoverArt
                          hue={track.coverHue}
                          title={track.title}
                          artworkUrl={track.artworkUrl}
                          className="h-14 w-14"
                        />
                      </Link>
                      <div className="absolute left-0.5 top-0.5 z-10 scale-90">
                        <HeartWish track={track} />
                      </div>
                      <div className="absolute bottom-0.5 right-0.5 z-10 scale-90">
                        <QuickPlay
                          src={track.previewUrl}
                          title={track.title}
                          artist={track.artist}
                        />
                      </div>
                    </div>
                    <Link href={`/traccia/${track.id}`} className="min-w-0">
                      <span className="block truncate text-xs font-semibold uppercase tracking-wide text-soft">
                        {track.artist}
                      </span>
                      <span className="block truncate font-semibold text-mist hover:text-signal">
                        {track.title}
                      </span>
                      {track.wishlistSaves != null && track.wishlistSaves > 0 ? (
                        <span className="mt-0.5 block text-[0.65rem] font-bold uppercase tracking-wider text-signal">
                          {track.wishlistSaves} wishlist
                          {track.wishlistSaves === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </Link>
                  </div>
                </td>
                <td className="hidden px-3 py-3 text-muted md:table-cell">
                  <span className="block max-w-[10rem] truncate">{track.label}</span>
                  <span className="block text-[0.65rem] uppercase tracking-wider text-muted/80">
                    {track.genre}
                    {track.bpm ? ` · ${track.bpm}` : ""}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  {bestDigi ? (
                    <Link href={`/traccia/${track.id}#buy`} className="block hover:opacity-90">
                      <span
                        className={`font-display text-base font-black tabular-nums ${
                          free ? "text-signal" : "text-mist"
                        }`}
                      >
                        {formatOfferPrice(bestDigi)}
                      </span>
                      <span className="mt-0.5 block text-[0.6rem] uppercase tracking-wider text-muted">
                        {storeName(bestDigi.storeId)}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  {bestVinyl && vinylBreak ? (
                    <Link
                      href={`/traccia/${track.id}?media=vinyl#buy`}
                      className="block hover:opacity-90"
                    >
                      <span className="font-display text-sm font-bold tabular-nums text-mist">
                        {vinylBreak.from ? (
                          <span className="mr-1 text-[0.65rem] font-bold uppercase text-signal">
                            da
                          </span>
                        ) : null}
                        {vinylBreak.disc}
                      </span>
                      <span className="mt-0.5 block text-[0.6rem] uppercase tracking-wider text-muted">
                        + {vinylBreak.ship} ship · {storeName(bestVinyl.storeId)}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-2 py-3 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <StationButton track={track} compact />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
