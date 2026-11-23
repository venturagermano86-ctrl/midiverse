import type { Offer, StoreId, Track } from "../types";

export type Adapter = {
  storeId: StoreId;
  /** Simula lookup ISRC / titolo+artista sul portale. */
  lookup: (track: Track) => Offer | null;
};

function paid(
  storeId: StoreId,
  priceEur: number,
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
}

function free(storeId: StoreId, format: string, url: string): Offer {
  return {
    storeId,
    kind: "free",
    priceEur: 0,
    currency: "EUR",
    format,
    url,
    access: "download",
  };
}

/**
 * Adapter demo: ogni store “controlla” il catalogo interno della traccia.
 * Struttura pronta per API reali (Beatport, Bandcamp, SoundCloud, …).
 */
export const ADAPTERS: Adapter[] = (
  [
    "beatport",
    "bandcamp",
    "traxsource",
    "juno",
    "whatpeopleplay",
    "boomkat",
    "bleep",
    "clone",
    "hardwax",
    "apple",
    "amazon",
    "soundcloud",
    "youtube",
    "freesound",
  ] as StoreId[]
).map((storeId) => ({
  storeId,
  lookup(track) {
    const hit = track.offers.find((o) => o.storeId === storeId);
    return hit ?? null;
  },
}));

export function buildOfferHelpers() {
  return { paid, free };
}
