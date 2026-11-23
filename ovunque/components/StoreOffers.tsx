import {
  formatPrice,
  offerButtonLabel,
} from "@/lib/catalog";
import { storeName } from "@/lib/stores";
import type { Offer } from "@/lib/types";

type Props = {
  offers: Offer[];
};

export function StoreOffers({ offers }: Props) {
  const exclusive = offers.length === 1;
  const hasFree = offers.some((o) => o.kind === "free" || o.priceEur === 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-mist">
          {exclusive
            ? "Buy from this store only"
            : hasFree
              ? "Free or paid — pick a store"
              : "Buy from any store"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {exclusive
            ? "Exclusive listing — one portal only."
            : hasFree
              ? "Free (SoundCloud / drop) beats Bandcamp and every paid cart."
              : "Same track on Beatport, Bandcamp and more — sorted by price."}
        </p>
      </div>

      <ul className="divide-y divide-line border-y border-line">
        {offers.map((offer, i) => {
          const best = i === 0;
          const isFree = offer.kind === "free" || offer.priceEur === 0;
          const isBc = offer.storeId === "bandcamp";
          const isBp = offer.storeId === "beatport";
          return (
            <li
              key={`${offer.storeId}-${offer.format}-${i}`}
              className="flex flex-wrap items-center gap-3 bg-row/40 px-1 py-4 animate-rise"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`font-display text-base font-semibold ${
                      isBc ? "text-bandcamp" : "text-mist"
                    }`}
                  >
                    {storeName(offer.storeId)}
                  </span>
                  {isBp && (
                    <span className="bg-signal/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-signal">
                      Beatport
                    </span>
                  )}
                  {isFree && (
                    <span className="bg-signal/20 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-signal">
                      Free
                    </span>
                  )}
                  {best && !exclusive && !isFree && (
                    <span className="bg-signal/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-signal">
                      Best price
                    </span>
                  )}
                  {best && !exclusive && isFree && (
                    <span className="bg-signal/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-signal">
                      Beats Bandcamp
                    </span>
                  )}
                  {exclusive && (
                    <span className="bg-ember/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-ember">
                      Exclusive
                    </span>
                  )}
                  {!isFree && (
                    <span className="border border-line px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
                      Paid
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">{offer.format}</p>
              </div>
              <p className={`font-display text-lg font-bold ${isFree ? "text-signal" : "text-mist"}`}>
                {formatPrice(offer.priceEur, offer.kind)}
              </p>
              <a
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-4 py-2 text-sm font-semibold transition ${
                  best || isFree
                    ? "bg-signal text-ink hover:brightness-110"
                    : "border border-line text-mist hover:border-signal hover:text-signal"
                }`}
              >
                {offerButtonLabel(offer)}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
