export type StoreId =
  | "beatport"
  | "bandcamp"
  | "traxsource"
  | "juno"
  | "whatpeopleplay"
  | "boomkat"
  | "apple"
  | "amazon";

export type Offer = {
  storeId: StoreId;
  priceEur: number;
  currency: "EUR";
  format: string;
  url: string;
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
  offers: Offer[];
};

export type StoreMeta = {
  id: StoreId;
  name: string;
  short: string;
};
