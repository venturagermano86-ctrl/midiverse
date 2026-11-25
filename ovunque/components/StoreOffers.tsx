"use client";

import { useMemo, useState } from "react";
import {
  formatOfferPrice,
  formatPrice,
  formatVinylBreakdown,
  landedPrice,
  offerButtonLabel,
  rankOffers,
} from "@/lib/catalog";
import { storeName } from "@/lib/stores";
import type { Offer } from "@/lib/types";

type MediaFilter = "all" | "digital" | "vinyl";
type SortMode = "cheap" | "alpha";

type Props = {
  offers: Offer[];
};

function OfferRow({
  offer,
  best,
  exclusive,
  index,
}: {
  offer: Offer;
  best: boolean;
  exclusive: boolean;
  index: number;
}) {
  const isFree = offer.kind === "free" || offer.priceEur === 0;
  const isBc = offer.storeId === "bandcamp";
  const isBp = offer.storeId === "beatport";
  const vinyl = formatVinylBreakdown(offer);
  const landed = landedPrice(offer);

  return (
    <li
      className="flex flex-wrap items-center gap-3 bg-row/40 px-1 py-4 animate-rise"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
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
          {isBp ? (
            <span className="rounded-dig bg-signal/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-signal">
              Beatport
            </span>
          ) : null}
          {offer.media === "vinyl" ? (
            <span className="rounded-dig bg-signal/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-signal">
              Vinyl
            </span>
          ) : (
            <span className="rounded-dig border border-line px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
              Digital
            </span>
          )}
          {isFree ? (
            <span className="rounded-dig bg-signal/20 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-signal">
              Free
            </span>
          ) : null}
          {best && !exclusive && !isFree ? (
            <span className="rounded-dig bg-signal/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-signal">
              {offer.media === "vinyl" ? "Landed migliore" : "Più economico"}
            </span>
          ) : null}
          {offer.priceFrom && offer.choicesCount ? (
            <span className="rounded-dig border border-line px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-soft">
              {offer.choicesCount} scelte
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted">{offer.format}</p>
        {offer.storeId === "discogs" && offer.priceFrom ? (
          <p className="mt-1 text-[0.7rem] text-soft">
            Minimo marketplace → apri Discogs per confrontare i seller
          </p>
        ) : null}
      </div>

      <div className="text-right">
        {vinyl ? (
          <>
            <p className="font-display text-lg font-black text-mist">
              {vinyl.from ? (
                <span className="mr-1 text-sm font-bold uppercase tracking-wider text-signal">
                  da
                </span>
              ) : null}
              {vinyl.disc}
              <span className="text-soft"> + </span>
              {vinyl.ship}
              <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-muted">
                spedizione
              </span>
            </p>
            <p className="mt-0.5 text-xs text-signal">
              {vinyl.from ? "Totale da " : "Totale "}
              {vinyl.total}
              {landed != null && best ? " · landed migliore" : ""}
            </p>
          </>
        ) : (
          <p
            className={`font-display text-lg font-black ${
              isFree ? "text-signal" : "text-mist"
            }`}
          >
            {formatOfferPrice(offer)}
          </p>
        )}
      </div>

      <a
        href={offer.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`rounded-dig px-4 py-2 text-sm font-semibold transition ${
          best || isFree
            ? "bg-signal text-ink hover:bg-signal-hi"
            : "border border-line text-mist hover:border-signal hover:text-signal"
        }`}
      >
        {offer.storeId === "discogs" && offer.priceFrom
          ? "Vedi scelte Discogs"
          : offerButtonLabel(offer)}
      </a>
    </li>
  );
}

export function StoreOffers({ offers }: Props) {
  const [media, setMedia] = useState<MediaFilter>("all");
  const [sort, setSort] = useState<SortMode>("cheap");
  /** 0 = solo i più economici, 100 = tutti. */
  const [cheapBias, setCheapBias] = useState(100);

  const digitalCount = offers.filter((o) => o.media !== "vinyl").length;
  const vinylCount = offers.filter((o) => o.media === "vinyl").length;
  const exclusive = offers.length === 1;

  const visible = useMemo(() => {
    let list = offers.filter((o) => {
      if (media === "digital") return o.media !== "vinyl";
      if (media === "vinyl") return o.media === "vinyl";
      return true;
    });
    list =
      sort === "cheap"
        ? rankOffers(list)
        : [...list].sort((a, b) =>
            storeName(a.storeId).localeCompare(storeName(b.storeId), "it"),
          );

    if (sort === "cheap" && cheapBias < 100 && list.length > 1) {
      // Tendina: più basso = mostra solo la fascia economica (min 2, max tutti)
      const keep = Math.max(2, Math.ceil((list.length * cheapBias) / 100));
      list = list.slice(0, keep);
    }
    return list;
  }, [offers, media, sort, cheapBias]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-black text-mist">
          Dove comprare — senza perdere tempo
        </h2>
        <p className="mt-1 text-sm text-soft">
          Solo digitale o solo vinile. Ordina dal più economico. Discogs mostra il minimo «da …
          + spedizione» e apre le scelte seller.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", `Tutto (${offers.length})`],
            ["digital", `Solo digitale (${digitalCount})`],
            ["vinyl", `Solo vinile (${vinylCount})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMedia(id)}
            disabled={id === "vinyl" && vinylCount === 0}
            className={`rounded-dig px-3 py-2 text-[0.7rem] font-bold uppercase tracking-wider transition disabled:opacity-40 ${
              media === id
                ? "bg-signal text-ink"
                : "border border-line text-muted hover:border-signal hover:text-signal"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
        <button
          type="button"
          onClick={() => setSort("cheap")}
          className={`rounded-dig px-3 py-2 text-[0.7rem] font-bold uppercase tracking-wider transition ${
            sort === "cheap"
              ? "bg-signal text-ink"
              : "border border-line text-muted hover:border-signal hover:text-signal"
          }`}
        >
          Dal più economico
        </button>
        <button
          type="button"
          onClick={() => setSort("alpha")}
          className={`rounded-dig px-3 py-2 text-[0.7rem] font-bold uppercase tracking-wider transition ${
            sort === "alpha"
              ? "bg-signal text-ink"
              : "border border-line text-muted hover:border-signal hover:text-signal"
          }`}
        >
          A–Z store
        </button>
      </div>

      {sort === "cheap" && visible.length > 0 ? (
        <label className="block max-w-md">
          <span className="flex justify-between text-[0.65rem] font-bold uppercase tracking-wider text-muted">
            <span>Fascia prezzo</span>
            <span className="text-signal">
              {cheapBias < 100 ? `Top ${visible.length} economici` : "Tutti i prezzi"}
            </span>
          </span>
          <input
            type="range"
            min={15}
            max={100}
            step={5}
            value={cheapBias}
            onChange={(e) => setCheapBias(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--accent,#5fd4a8)]"
          />
          <span className="mt-1 flex justify-between text-[0.65rem] text-muted">
            <span>Solo i più bassi</span>
            <span>Mostra tutto</span>
          </span>
        </label>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-dig-lg border border-line bg-panel px-4 py-8 text-sm text-muted">
          Nessuna offerta in questo filtro.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {visible.map((offer, i) => (
            <OfferRow
              key={`${offer.storeId}-${offer.media}-${offer.format}-${i}`}
              offer={offer}
              best={i === 0 && sort === "cheap"}
              exclusive={exclusive}
              index={i}
            />
          ))}
        </ul>
      )}

      {media !== "vinyl" && digitalCount > 1 ? (
        <p className="text-xs text-muted">
          Digitale: ogni riga = uno store con prezzo vicino (o «Vedi store» se lo store non
          lista il prezzo in API). Gratis in cima.
        </p>
      ) : null}
      {media !== "digital" && vinylCount > 0 ? (
        <p className="text-xs text-muted">
          Vinile: disco + spedizione subito. Discogs ={" "}
          <span className="text-mist">da {formatPrice(12)} + {formatPrice(8)} spedizione</span>{" "}
          in su, link alle scelte seller.
        </p>
      ) : null}
    </div>
  );
}
