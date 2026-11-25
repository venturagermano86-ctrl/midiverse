import type { Offer, Track } from "../types";
import { storeName } from "../stores";

/** Totale landed: disco + spedizione (vinile) oppure solo prezzo. */
export function landedPrice(o: Offer): number | null {
  if (o.kind === "free" || o.priceEur === 0) return 0;
  if (o.priceEur == null) return null;
  const ship =
    o.media === "vinyl" && o.shippingEur != null && !Number.isNaN(o.shippingEur)
      ? o.shippingEur
      : 0;
  return Math.round((o.priceEur + ship) * 100) / 100;
}

function priceKey(o: Offer): number {
  const landed = landedPrice(o);
  if (landed === 0) return -1;
  if (landed == null) return Number.POSITIVE_INFINITY;
  return landed;
}

/** Gratis → landed crescenti → store senza prezzo listato (deep-link). */
export function rankOffers(offers: Offer[]): Offer[] {
  return [...offers].sort((a, b) => {
    const ka = priceKey(a);
    const kb = priceKey(b);
    if (ka !== kb) return ka - kb;
    // Vinyl vs digital: a parità, digital prima se entrambi senza totale diverso
    if ((a.media === "vinyl") !== (b.media === "vinyl")) {
      return a.media === "vinyl" ? 1 : -1;
    }
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

export function digitalOffers(offers: Offer[]): Offer[] {
  return rankOffers(offers.filter((o) => o.media !== "vinyl"));
}

export function vinylOffers(offers: Offer[]): Offer[] {
  return rankOffers(
    offers.filter(
      (o) =>
        o.media === "vinyl" &&
        o.priceEur != null &&
        o.priceEur > 0 &&
        o.shippingEur != null &&
        o.shippingEur >= 0,
    ),
  );
}

function eur(n: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export function formatPrice(
  eurVal: number | null | undefined,
  kind?: Offer["kind"],
): string {
  if (kind === "free" || eurVal === 0) return "Gratis";
  if (eurVal == null || Number.isNaN(eurVal)) return "Vedi store";
  return eur(eurVal);
}

/**
 * Vinile: «12,90 € + 8,00 € spedizione» o Discogs «da 12,90 € + 8,00 € spedizione».
 * Digitale: prezzo singolo o Gratis / Vedi store.
 */
export function formatOfferPrice(offer: Offer): string {
  if (offer.kind === "free" || offer.priceEur === 0) return "Gratis";
  if (offer.priceEur == null) return "Vedi store";
  if (
    offer.media === "vinyl" &&
    offer.shippingEur != null &&
    !Number.isNaN(offer.shippingEur)
  ) {
    const core = `${eur(offer.priceEur)} + ${eur(offer.shippingEur)} spedizione`;
    return offer.priceFrom ? `da ${core}` : core;
  }
  if (offer.priceFrom) return `da ${eur(offer.priceEur)}`;
  return eur(offer.priceEur);
}

export function formatVinylBreakdown(offer: Offer): {
  disc: string;
  ship: string;
  total: string;
  line: string;
  from: boolean;
  choices?: number;
} | null {
  if (
    offer.media !== "vinyl" ||
    offer.priceEur == null ||
    offer.shippingEur == null
  ) {
    return null;
  }
  const total = landedPrice(offer) ?? offer.priceEur + offer.shippingEur;
  const core = `${eur(offer.priceEur)} + ${eur(offer.shippingEur)} spedizione`;
  return {
    disc: eur(offer.priceEur),
    ship: eur(offer.shippingEur),
    total: eur(total),
    from: !!offer.priceFrom,
    choices: offer.choicesCount,
    line: offer.priceFrom ? `da ${core}` : core,
  };
}

export function ctaLabel(offer: Offer, exclusive: boolean): string {
  if (offer.kind === "free" || offer.priceEur === 0) {
    return `Scarica gratis · ${storeName(offer.storeId)}`;
  }
  if (offer.priceEur == null) {
    return `Apri su ${storeName(offer.storeId)}`;
  }
  if (offer.media === "vinyl") {
    const line = formatOfferPrice(offer);
    return exclusive ? `Vinile · ${line}` : `Vinile più conveniente · ${line}`;
  }
  if (exclusive) return `Compra su ${storeName(offer.storeId)}`;
  return `Compra al prezzo migliore · ${formatPrice(offer.priceEur)}`;
}

export function offerButtonLabel(offer: Offer): string {
  if (offer.kind === "free" || offer.priceEur === 0) return "Scarica gratis";
  if (offer.priceEur == null) return "Apri store";
  if (offer.media === "vinyl") return "Compra vinile";
  return "Compra";
}
