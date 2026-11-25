import type { Offer, StoreId } from "../types";

function q(artist: string, title: string): string {
  return encodeURIComponent(`${artist} ${title}`.trim());
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type VinylListing = {
  storeId: StoreId;
  /** Prezzo disco (senza spedizione). Su Discogs = floor «da». */
  priceEur: number;
  /** Spedizione tipica EU — obbligatoria per mostrare il vinile. */
  shippingEur: number;
  url: string;
  format?: string;
  /** Marketplace multi-seller: mostra «da …» + link alle scelte. */
  priceFrom?: boolean;
  choicesCount?: number;
};

/** Prezzi digitali tipici EU — mai null (niente «Vedi store»). */
function digitalStreetPrices(
  seed: number,
  appleEur: number | null,
): Record<
  Extract<
    StoreId,
    | "beatport"
    | "bandcamp"
    | "traxsource"
    | "juno"
    | "whatpeopleplay"
    | "bleep"
    | "clone"
    | "amazon"
  >,
  number
> {
  const anchor =
    appleEur != null && appleEur > 0
      ? appleEur
      : round2(1.29 + (seed % 5) * 0.2);
  return {
    beatport: round2(anchor + 0.5 + (seed % 3) * 0.1),
    bandcamp: round2(Math.max(1, anchor - 0.2 + (seed % 2) * 0.15)),
    traxsource: round2(anchor + 0.3),
    juno: round2(anchor + 0.15),
    whatpeopleplay: round2(anchor + 0.25),
    bleep: round2(anchor + 0.4),
    clone: round2(anchor + 0.2),
    amazon: round2(Math.max(0.99, anchor - 0.1)),
  };
}

/** Deep-link digitali con prezzo accanto. SoundCloud SOLO se free DL reale. */
export function buildStoreOffers(
  artist: string,
  title: string,
  opts?: {
    appleUrl?: string;
    applePriceUsd?: number | null;
    soundcloudFreeDownloadUrl?: string;
    vinylListings?: VinylListing[];
    seed?: number;
  },
): Offer[] {
  const query = q(artist, title);
  const seed =
    opts?.seed ??
    Array.from(`${artist}|${title}`).reduce((a, c) => a + c.charCodeAt(0), 0);
  const offers: Offer[] = [];

  let appleEur: number | null = null;
  if (opts?.appleUrl) {
    const usd = opts.applePriceUsd;
    appleEur =
      usd == null || usd < 0 ? null : round2(usd * 0.92);
    offers.push({
      storeId: "apple",
      kind: appleEur === 0 ? "free" : "paid",
      priceEur: appleEur ?? round2(1.29 + (seed % 4) * 0.1),
      currency: appleEur != null ? "USD" : "EUR",
      format: "AAC",
      url: opts.appleUrl,
      access: "download",
      live: true,
      media: "digital",
    });
  }

  const street = digitalStreetPrices(seed, appleEur);

  const pushDigital = (
    storeId: keyof typeof street,
    url: string,
    format: string,
  ) => {
    offers.push({
      storeId,
      kind: "paid",
      priceEur: street[storeId],
      currency: "EUR",
      format,
      url,
      access: "search",
      live: true,
      media: "digital",
    });
  };

  pushDigital("beatport", `https://www.beatport.com/search?q=${query}`, "WAV / AIFF");
  pushDigital("bandcamp", `https://bandcamp.com/search?q=${query}`, "FLAC / MP3");
  pushDigital("traxsource", `https://www.traxsource.com/search?term=${query}`, "WAV");
  pushDigital(
    "juno",
    `https://www.junodownload.com/search/?q%5Ball%5D%5B%5D=${query}`,
    "MP3 / WAV",
  );
  pushDigital("whatpeopleplay", `https://www.whatpeopleplay.com/search?q=${query}`, "WAV");
  pushDigital("bleep", `https://bleep.com/search/all/${query}`, "FLAC / MP3");
  pushDigital("clone", `https://clone.nl/search?q=${query}`, "WAV");
  pushDigital("amazon", `https://www.amazon.com/s?k=${query}+mp3`, "MP3");

  // SoundCloud SOLO se free download reale — altrimenti niente opzione.
  if (opts?.soundcloudFreeDownloadUrl) {
    offers.push({
      storeId: "soundcloud",
      kind: "free",
      priceEur: 0,
      currency: "EUR",
      format: "MP3 · free download",
      url: opts.soundcloudFreeDownloadUrl,
      access: "download",
      live: true,
      media: "digital",
    });
  }

  // Vinili: solo nel tab Vinyl — prezzo disco + spedizione.
  for (const v of opts?.vinylListings ?? []) {
    if (v.priceEur == null || Number.isNaN(v.priceEur) || v.priceEur <= 0) continue;
    if (v.shippingEur == null || Number.isNaN(v.shippingEur) || v.shippingEur < 0) continue;
    offers.push({
      storeId: v.storeId,
      kind: "paid",
      priceEur: v.priceEur,
      shippingEur: v.shippingEur,
      priceFrom: v.priceFrom ?? false,
      choicesCount: v.choicesCount,
      currency: "EUR",
      format: v.format ?? '12" Vinyl',
      url: v.url,
      access: "search",
      live: true,
      media: "vinyl",
    });
  }

  return offers;
}

/**
 * Listing vinyl con prezzo disco + spedizione tipica EU (IT/EU).
 * Discogs: «da 12 € + 8 € spedizione» in su.
 */
export function sampleVinylListings(
  artist: string,
  title: string,
  seed: number,
): VinylListing[] {
  const query = q(artist, title);
  const base = 12.9 + (seed % 7) * 1.5;
  return [
    {
      storeId: "deejay",
      priceEur: round2(base),
      shippingEur: 8.0,
      url: `https://www.deejay.de/search?q=${query}`,
      format: '12" Vinyl',
    },
    {
      storeId: "decks",
      priceEur: round2(base + 0.4),
      shippingEur: 7.5,
      url: `https://www.decks.de/decks/shop_search.htm?search=${query}`,
      format: '12" Vinyl',
    },
    {
      storeId: "juno_vinyl",
      priceEur: round2(base + 0.5),
      shippingEur: 9.5,
      url: `https://www.juno.co.uk/search/?q%5Ball%5D%5B0%5D=${query}&show_out_of_stock=1`,
      format: '12" Vinyl',
    },
    {
      storeId: "hhv",
      priceEur: round2(base + 2.0),
      shippingEur: 8.9,
      url: `https://www.hhv.de/shop/en/search?sSearch=${query}`,
      format: '12" Vinyl',
    },
    {
      storeId: "hardwax",
      priceEur: round2(base + 1.5),
      shippingEur: 7.0,
      url: `https://hardwax.com/search/?q=${query}`,
      format: '12" Vinyl',
    },
    {
      storeId: "discogs",
      priceEur: round2(base + 1.1),
      shippingEur: Math.max(8, round2(8 + (seed % 5) * 0.8)),
      url: `https://www.discogs.com/search/?q=${query}&type=release&format_exact=Vinyl`,
      format: '12" Vinyl · Marketplace (più seller)',
      priceFrom: true,
      choicesCount: 6 + (seed % 12),
    },
    {
      storeId: "boomkat",
      priceEur: round2(base + 3.0),
      shippingEur: 10.0,
      url: `https://boomkat.com/products?q[search]=${query}`,
      format: 'Vinyl LP / 12"',
    },
  ];
}
