import type { Offer, StoreId, Track } from "../types";
import { STORE_ORDER } from "../stores";

export type Adapter = {
  storeId: StoreId;
  lookup: (track: Track) => Offer | null;
};

/**
 * Adapter: usa le offer già collegate (live deep-link o curated).
 * Beatport/Bandcamp/Juno… risultano “found” se c’è URL reale sulla traccia.
 */
export const ADAPTERS: Adapter[] = STORE_ORDER.map((storeId) => ({
  storeId,
  lookup(track) {
    return track.offers.find((o) => o.storeId === storeId) ?? null;
  },
}));

export function buildOfferHelpers() {
  return {
    paid(
      storeId: StoreId,
      priceEur: number | null,
      format: string,
      url: string,
    ): Offer {
      return {
        storeId,
        kind: "paid",
        priceEur,
        currency: "EUR",
        format,
        url,
        access: "download",
      };
    },
  };
}
