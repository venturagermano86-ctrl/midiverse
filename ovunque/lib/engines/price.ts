import type { Offer, Track } from "../types";
import { storeName } from "../stores";

/** Gratis batte qualsiasi prezzo a pagamento. Poi prezzo crescente, poi nome store. */
export function rankOffers(offers: Offer[]): Offer[] {
  return [...offers].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "free" ? -1 : 1;
    if (a.priceEur !== b.priceEur) return a.priceEur - b.priceEur;
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
  return rankOffers(track.offers.filter((o) => o.kind === "free" || o.priceEur === 0));
}

export function paidOffers(track: Track): Offer[] {
  return rankOffers(track.offers.filter((o) => o.kind === "paid" && o.priceEur > 0));
}

export function formatPrice(eur: number, kind?: Offer["kind"]): string {
  if (kind === "free" || eur === 0) return "Gratis";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(eur);
}

export function ctaLabel(offer: Offer, exclusive: boolean): string {
  if (offer.kind === "free" || offer.priceEur === 0) {
    return `Scarica gratis · ${storeName(offer.storeId)}`;
  }
  if (exclusive) return `Compra su ${storeName(offer.storeId)}`;
  return `Compra al prezzo migliore · ${formatPrice(offer.priceEur)}`;
}

export function offerButtonLabel(offer: Offer): string {
  if (offer.kind === "free" || offer.priceEur === 0) return "Scarica gratis";
  return "Compra";
}
