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
  | "deejay"
  | "roughtrade"
  | "discogs"
  | "hhv"
  | "juno_vinyl"
  | "apple"
  | "amazon"
  | "soundcloud"
  | "youtube"
  | "freesound";

export type OfferKind = "free" | "paid";

export type MediaKind = "digital" | "vinyl";

export type Offer = {
  storeId: StoreId;
  kind: OfferKind;
  /** 0 = gratis. null = prezzo non listato (solo digital deep-link). Vinyl senza prezzo = non mostrare. */
  priceEur: number | null;
  /** Spedizione (vinile). UI: «12 € + 8 € spedizione» oppure Discogs «da 12 € + 8 €». */
  shippingEur?: number | null;
  /**
   * Prezzo minimo marketplace (Discogs ecc.): mostra «da …» e link alle scelte seller.
   * priceEur resta il floor; shippingEur la ship tipica minima.
   */
  priceFrom?: boolean;
  /** Quante scelte seller / listing (hint UI). */
  choicesCount?: number;
  currency: "EUR" | "USD";
  format: string;
  url: string;
  access?: "download" | "name_your_price" | "stream" | "search";
  live?: boolean;
  media?: MediaKind;
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
  artworkUrl?: string;
  previewUrl?: string;
  source?: "curated" | "itunes" | "live";
  hasVinyl?: boolean;
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
