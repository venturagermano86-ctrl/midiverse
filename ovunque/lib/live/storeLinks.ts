import type { Offer, StoreId } from "../types";

function q(artist: string, title: string): string {
  return encodeURIComponent(`${artist} ${title}`.trim());
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

/** Deep-link digitali. SoundCloud SOLO con free DL reale. */
export function buildStoreOffers(
  artist: string,
  title: string,
  opts?: {
    appleUrl?: string;
    applePriceUsd?: number | null;
    soundcloudFreeDownloadUrl?: string;
    vinylListings?: VinylListing[];
  },
): Offer[] {
  const query = q(artist, title);
  const offers: Offer[] = [];

  const pushDigital = (
    storeId: StoreId,
    url: string,
    format: string,
    priceEur: number | null,
    kind: Offer["kind"] = "paid",
    access: Offer["access"] = "search",
  ) => {
    offers.push({
      storeId,
      kind,
      priceEur,
      currency: "EUR",
      format,
      url,
      access,
      live: true,
      media: "digital",
    });
  };

  if (opts?.appleUrl) {
    const usd = opts.applePriceUsd;
    const eur =
      usd == null || usd < 0 ? null : Math.round(usd * 0.92 * 100) / 100;
    offers.push({
      storeId: "apple",
      kind: eur === 0 ? "free" : "paid",
      priceEur: eur,
      currency: "USD",
      format: "AAC",
      url: opts.appleUrl,
      access: "download",
      live: true,
      media: "digital",
    });
  }

  pushDigital("beatport", `https://www.beatport.com/search?q=${query}`, "WAV / AIFF", null);
  pushDigital("bandcamp", `https://bandcamp.com/search?q=${query}`, "FLAC / MP3", null);
  pushDigital("traxsource", `https://www.traxsource.com/search?term=${query}`, "WAV", null);
  pushDigital(
    "juno",
    `https://www.junodownload.com/search/?q%5Ball%5D%5B%5D=${query}`,
    "MP3 / WAV",
    null,
  );
  pushDigital("whatpeopleplay", `https://www.whatpeopleplay.com/search?q=${query}`, "WAV", null);
  pushDigital("bleep", `https://bleep.com/search/all/${query}`, "FLAC / MP3", null);
  pushDigital("clone", `https://clone.nl/search?q=${query}`, "WAV", null);
  pushDigital(
    "decks",
    `https://www.decks.de/decks/shop_search.htm?search=${query}`,
    "Digital / Vinyl search",
    null,
  );
  pushDigital(
    "deejay",
    `https://www.deejay.de/search?q=${query}`,
    "Vinyl / Digital search",
    null,
  );
  pushDigital("amazon", `https://www.amazon.com/s?k=${query}+mp3`, "MP3", null);

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

  // Vinili: prezzo disco + spedizione obbligatori (altrimenti non è utile).
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
 * Esempio UI: «12,90 € + 8,00 € spedizione».
 */
export function sampleVinylListings(
  artist: string,
  title: string,
  seed: number,
): VinylListing[] {
  const query = q(artist, title);
  const base = 12.9 + (seed % 7) * 1.5;
  const round = (n: number) => Math.round(n * 100) / 100;
  return [
    {
      storeId: "deejay",
      priceEur: round(base),
      shippingEur: 8.0,
      url: `https://www.deejay.de/search?q=${query}`,
      format: '12" Vinyl',
    },
    {
      storeId: "decks",
      priceEur: round(base + 0.4),
      shippingEur: 7.5,
      url: `https://www.decks.de/decks/shop_search.htm?search=${query}`,
      format: '12" Vinyl',
    },
    {
      storeId: "juno_vinyl",
      priceEur: round(base + 0.5),
      shippingEur: 9.5,
      url: `https://www.juno.co.uk/search/?q%5Ball%5D%5B0%5D=${query}&show_out_of_stock=1`,
      format: '12" Vinyl',
    },
    {
      storeId: "hhv",
      priceEur: round(base + 2.0),
      shippingEur: 8.9,
      url: `https://www.hhv.de/shop/en/search?sSearch=${query}`,
      format: '12" Vinyl',
    },
    {
      storeId: "hardwax",
      priceEur: round(base + 1.5),
      shippingEur: 7.0,
      url: `https://hardwax.com/search/?q=${query}`,
      format: '12" Vinyl',
    },
    {
      storeId: "discogs",
      priceEur: round(base + 1.1),
      shippingEur: Math.max(8, round(8 + (seed % 5) * 0.8)),
      url: `https://www.discogs.com/search/?q=${query}&type=release&format_exact=Vinyl`,
      format: '12" Vinyl · Marketplace (più seller)',
      priceFrom: true,
      choicesCount: 6 + (seed % 12),
    },
    {
      storeId: "boomkat",
      priceEur: round(base + 3.0),
      shippingEur: 10.0,
      url: `https://boomkat.com/products?q[search]=${query}`,
      format: 'Vinyl LP / 12"',
    },
  ];
}
