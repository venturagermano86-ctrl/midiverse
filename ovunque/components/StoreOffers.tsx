"use client";

import { useMemo, useState } from "react";
import {
  digitalOffers,
  formatOfferPrice,
  formatVinylBreakdown,
  landedPrice,
  offerButtonLabel,
  rankOffers,
  vinylOffers,
} from "@/lib/catalog";
import { storeName } from "@/lib/stores";
import type { Offer } from "@/lib/types";

type MediaTab = "digital" | "vinyl";
type SortMode = "cheap" | "alpha";

type Props = {
  offers: Offer[];
  /** Tab iniziale: digital di default — vinyl solo se clicchi. */
  initialTab?: MediaTab;
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
          ? "Scelte Discogs"
          : offerButtonLabel(offer)}
      </a>
    </li>
  );
}

export function StoreOffers({ offers, initialTab = "digital" }: Props) {
  const digi = useMemo(() => digitalOffers(offers), [offers]);
  const vinyl = useMemo(() => vinylOffers(offers), [offers]);
  const [tab, setTab] = useState<MediaTab>(
    initialTab === "vinyl" && vinyl.length > 0 ? "vinyl" : "digital",
  );
  const [sort, setSort] = useState<SortMode>("cheap");
  const [cheapBias, setCheapBias] = useState(100);

  const exclusive = offers.length === 1;
  const activeList = tab === "vinyl" ? vinyl : digi;

  const visible = useMemo(() => {
    let list =
      sort === "cheap"
        ? rankOffers(activeList)
        : [...activeList].sort((a, b) =>
            storeName(a.storeId).localeCompare(storeName(b.storeId), "it"),
          );
    if (sort === "cheap" && cheapBias < 100 && list.length > 1) {
      const keep = Math.max(2, Math.ceil((list.length * cheapBias) / 100));
      list = list.slice(0, keep);
    }
    return list;
  }, [activeList, sort, cheapBias]);

  return (
    <div className="space-y-5" id="buy">
      <div>
        <h2 className="font-display text-lg font-black text-mist">Dove comprare</h2>
        <p className="mt-1 text-sm text-soft">
          Digitale e vinile sono separati — clicca <strong className="text-mist">Vinyl</strong>{" "}
          per vedere disco + spedizione.
        </p>
      </div>

      {/* Tab cliccabili: mai prezzi misti nella stessa lista */}
      <div
        className="flex gap-1 rounded-dig-lg border border-line bg-panel p-1"
        role="tablist"
        aria-label="Formato"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "digital"}
          onClick={() => setTab("digital")}
          className={`flex-1 rounded-dig px-4 py-3 text-sm font-bold transition ${
            tab === "digital"
              ? "bg-signal text-ink"
              : "text-muted hover:text-mist"
          }`}
        >
          Digital
          <span className="ml-2 text-[0.65rem] font-semibold opacity-80">
            {digi.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "vinyl"}
          disabled={vinyl.length === 0}
          onClick={() => vinyl.length > 0 && setTab("vinyl")}
          className={`flex-1 rounded-dig px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${
            tab === "vinyl"
              ? "bg-signal text-ink"
              : "text-muted hover:text-mist"
          }`}
        >
          Vinyl
          <span className="ml-2 text-[0.65rem] font-semibold opacity-80">
            {vinyl.length}
          </span>
        </button>
      </div>

      {tab === "vinyl" ? (
        <p className="text-sm text-soft">
          Solo vinile: prezzo disco + spedizione (es.{" "}
          <span className="text-mist">da 12,90 € + 8,00 € spedizione</span> su Discogs).
        </p>
      ) : (
        <p className="text-sm text-soft">
          Solo digitale: Beatport, Bandcamp, Traxsource… ordinati dal più economico.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
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
        </label>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-dig-lg border border-line bg-panel px-4 py-8 text-sm text-muted">
          {tab === "vinyl"
            ? "Nessun vinile listato per questa traccia."
            : "Nessuna offerta digitale."}
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {visible.map((offer, i) => (
            <OfferRow
              key={`${tab}-${offer.storeId}-${offer.format}-${i}`}
              offer={offer}
              best={i === 0 && sort === "cheap"}
              exclusive={exclusive}
              index={i}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
