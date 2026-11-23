import Link from "next/link";
import { AddToCollectionButton } from "@/components/AddToCollectionButton";
import { CoverArt } from "@/components/CoverArt";
import { cheapestOffer, formatPrice, hasFreeOffer } from "@/lib/catalog";
import { storeName } from "@/lib/stores";
import type { Track } from "@/lib/types";

type Props = {
  tracks: Track[];
  showRank?: boolean;
};

export function ChartTable({ tracks, showRank = true }: Props) {
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-panel text-[0.65rem] uppercase tracking-[0.16em] text-muted">
            {showRank ? <th className="w-12 px-3 py-3 font-semibold">#</th> : null}
            <th className="px-3 py-3 font-semibold">Title</th>
            <th className="hidden px-3 py-3 font-semibold md:table-cell">Label</th>
            <th className="hidden px-3 py-3 font-semibold lg:table-cell">Genre</th>
            <th className="px-3 py-3 font-semibold">BPM</th>
            <th className="hidden px-3 py-3 font-semibold sm:table-cell">Key</th>
            <th className="px-3 py-3 font-semibold text-right">Best price</th>
            <th className="w-24 px-3 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, i) => {
            const best = cheapestOffer(track);
            if (!best) return null;
            const free = hasFreeOffer(track);
            return (
              <tr key={track.id} className="chart-row border-b border-line/80 bg-row">
                {showRank ? (
                  <td className="px-3 py-2.5 font-display text-sm font-bold text-signal">
                    {i + 1}
                  </td>
                ) : null}
                <td className="px-3 py-2.5">
                  <Link href={`/traccia/${track.id}`} className="flex items-center gap-3">
                    <CoverArt
                      hue={track.coverHue}
                      title={track.title}
                      className="h-11 w-11 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-mist hover:text-signal">
                        {track.title}
                      </span>
                      <span className="block truncate text-xs text-muted">{track.artist}</span>
                    </span>
                  </Link>
                </td>
                <td className="hidden px-3 py-2.5 text-muted md:table-cell">{track.label}</td>
                <td className="hidden px-3 py-2.5 text-muted lg:table-cell">{track.genre}</td>
                <td className="px-3 py-2.5 tabular-nums text-mist/80">{track.bpm ?? "—"}</td>
                <td className="hidden px-3 py-2.5 text-mist/80 sm:table-cell">{track.key ?? "—"}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`font-semibold ${free ? "text-signal" : "text-mist"}`}>
                    {formatPrice(best.priceEur, best.kind)}
                  </span>
                  <span className="mt-0.5 block text-[0.65rem] text-muted">
                    {storeName(best.storeId)}
                    {track.offers.length > 1 ? ` · ${track.offers.length} stores` : ""}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <AddToCollectionButton trackId={track.id} compact />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
