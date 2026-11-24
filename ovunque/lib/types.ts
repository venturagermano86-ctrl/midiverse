export type StoreId =
  | "beatport"
  | "bandcamp"
  | "traxsource"
  | "juno"
  | "whatpeopleplay"
  | "boomkat"
  | "bleep"
  | "clone"
  | "hardwax"
  | "decks"
  | "roughtrade"
  | "discogs"
  | "apple"
  | "amazon"
  | "soundcloud"
  | "youtube"
  | "freesound";

export type OfferKind = "free" | "paid";

export type Offer = {
  storeId: StoreId;
  kind: OfferKind;
  /** 0 = gratis. null = prezzo solo sullo store (deep-link reale). */
  priceEur: number | null;
  currency: "EUR" | "USD";
  format: string;
  url: string;
  access?: "download" | "name_your_price" | "stream" | "search";
  live?: boolean;
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  label: string;
  genre: string;
  bpm?: number;
  key?: string;
  year: number;
  mood: string;
  coverHue: number;
  suggested: boolean;
  rails: string[];
  isrc?: string;
  offers: Offer[];
  /** Cover reale (iTunes) se presente */
  artworkUrl?: string;
  previewUrl?: string;
  source?: "curated" | "itunes" | "live";
};

export type StoreMeta = {
  id: StoreId;
  name: string;
  short: string;
  kind: "shop" | "free" | "hybrid";
  blurb: string;
};

export type ScanHit = {
  storeId: StoreId;
  status: "found" | "missing" | "error";
  offer?: Offer;
  latencyMs: number;
  note?: string;
};

export type ScanReport = {
  trackId: string;
  scannedAt: string;
  hits: ScanHit[];
  ranked: Offer[];
  best: Offer | null;
  portalsChecked: number;
  freeFound: boolean;
};
