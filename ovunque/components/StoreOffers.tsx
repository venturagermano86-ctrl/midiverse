import { formatPrice } from "@/lib/catalog";
import { storeName } from "@/lib/stores";
import type { Offer } from "@/lib/types";

type Props = {
  offers: Offer[];
};

export function StoreOffers({ offers }: Props) {
  const exclusive = offers.length === 1;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-mist">
          {exclusive ? "La puoi comprare solo qui" : "Scegli dove comprarla"}
        </h2>
        <p className="mt-1 text-sm text-mist/50">
          {exclusive
            ? "Questa traccia è disponibile su un solo portale."
            : "Stessa traccia, portali diversi — ordina per prezzo e apri lo store che preferisci."}
        </p>
      </div>

      <ul className="divide-y divide-white/10 border-y border-white/10">
        {offers.map((offer, i) => {
          const best = i === 0;
          return (
            <li
              key={`${offer.storeId}-${offer.format}`}
              className="flex flex-wrap items-center gap-3 py-4 animate-rise"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-base font-semibold text-mist">
                    {storeName(offer.storeId)}
                  </span>
                  {best && !exclusive && (
                    <span className="rounded-sm bg-signal/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-signal">
                      Prezzo migliore
                    </span>
                  )}
                  {exclusive && (
                    <span className="rounded-sm bg-ember/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-ember">
                      Unico store
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-mist/45">{offer.format}</p>
              </div>
              <p className="font-display text-lg font-bold text-mist">
                {formatPrice(offer.priceEur)}
              </p>
              <a
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-sm px-4 py-2 text-sm font-semibold transition ${
                  best
                    ? "bg-signal text-ink hover:brightness-110"
                    : "border border-white/15 text-mist hover:border-signal/50 hover:text-signal"
                }`}
              >
                Compra
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
