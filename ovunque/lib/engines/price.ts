import type { Offer, Track } from "../types";
import { storeName } from "../stores";

function priceKey(o: Offer): number {
  if (o.kind === "free" || o.priceEur === 0) return -1;
  if (o.priceEur == null) return Number.POSITIVE_INFINITY;
  return o.priceEur;
}

/** Gratis → prezzi noti crescenti → store senza prezzo listato (deep-link). */
export function rankOffers(offers: Offer[]): Offer[] {
  return [...offers].sort((a, b) => {
    const ka = priceKey(a);
    const kb = priceKey(b);
    if (ka !== kb) return ka - kb;
    return storeName(a.storeId).localeCompare(storeName(b.storeId), "it");
  });
}

export function cheapestOffer(track: Track): Offer | null {
  if (track.offers.length === 0) return null;
  return rankOffers(track.offers)[0] ?? null;
}

export function hasFreeOffer(track: Track): boolean {
  return track.offers.some((o) => o.kind === "free" || o.priceEur === 0);
}

export function freeOffers(track: Track): Offer[] {
  return rankOffers(
    track.offers.filter((o) => o.kind === "free" || o.priceEur === 0),
  );
}

export function paidOffers(track: Track): Offer[] {
  return rankOffers(
    track.offers.filter((o) => o.kind === "paid" && (o.priceEur == null || o.priceEur > 0)),
  );
}

export function formatPrice(
  eur: number | null | undefined,
  kind?: Offer["kind"],
): string {
  if (kind === "free" || eur === 0) return "Gratis";
  if (eur == null || Number.isNaN(eur)) return "Vedi store";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(eur);
}

export function ctaLabel(offer: Offer, exclusive: boolean): string {
  if (offer.kind === "free" || offer.priceEur === 0) {
    return `Scarica gratis · ${storeName(offer.storeId)}`;
  }
  if (offer.priceEur == null) {
    return `Apri su ${storeName(offer.storeId)}`;
  }
  if (exclusive) return `Compra su ${storeName(offer.storeId)}`;
  return `Compra al prezzo migliore · ${formatPrice(offer.priceEur)}`;
}

export function offerButtonLabel(offer: Offer): string {
  if (offer.kind === "free" || offer.priceEur === 0) return "Scarica gratis";
  if (offer.priceEur == null) return "Apri store";
  return "Compra";
}
