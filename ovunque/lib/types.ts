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
  | "apple"
  | "amazon"
  | "soundcloud"
  | "youtube"
  | "freesound";

export type OfferKind = "free" | "paid";

export type Offer = {
  storeId: StoreId;
  kind: OfferKind;
  /** 0 = gratis. Per free resta 0. */
  priceEur: number;
  currency: "EUR";
  format: string;
  url: string;
  /** Es. download diretto, name-your-price, streaming-only */
  access?: "download" | "name_your_price" | "stream";
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
  /** Chiavi per matching cross-store (demo). */
  isrc?: string;
  offers: Offer[];
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
