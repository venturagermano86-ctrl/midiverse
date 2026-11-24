import type { Offer, StoreId } from "../types";

function q(artist: string, title: string): string {
  return encodeURIComponent(`${artist} ${title}`.trim());
}

/** Deep-link reali: stessa traccia → ricerca/acquisto sul portale. */
export function buildStoreOffers(
  artist: string,
  title: string,
  opts?: {
    appleUrl?: string;
    applePriceUsd?: number | null;
    artworkHint?: string;
  },
): Offer[] {
  const query = q(artist, title);
  const offers: Offer[] = [];

  const push = (
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
    });
  };

  // Apple: prezzo reale se disponibile
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
    });
  }

  push("beatport", `https://www.beatport.com/search?q=${query}`, "WAV / AIFF", null);
  push("bandcamp", `https://bandcamp.com/search?q=${query}`, "FLAC / MP3", null);
  push("traxsource", `https://www.traxsource.com/search?term=${query}`, "WAV", null);
  push(
    "juno",
    `https://www.junodownload.com/search/?q%5Ball%5D%5B%5D=${query}`,
    "MP3 / WAV",
    null,
  );
  push(
    "whatpeopleplay",
    `https://www.whatpeopleplay.com/search?q=${query}`,
    "WAV",
    null,
  );
  push("boomkat", `https://boomkat.com/products?q[search]=${query}`, "MP3 / WAV", null);
  push("bleep", `https://bleep.com/search/all/${query}`, "FLAC / MP3", null);
  push("clone", `https://clone.nl/search?q=${query}`, "WAV", null);
  push("hardwax", `https://hardwax.com/search/?q=${query}`, "WAV", null);
  push("decks", `https://www.decks.de/decks/shop_search.htm?search=${query}`, "Digital / Vinyl", null);
  push("roughtrade", `https://www.roughtrade.com/search?q=${query}`, "Digital / Vinyl", null);
  push("discogs", `https://www.discogs.com/search/?q=${query}&type=release`, "Marketplace", null);
  push("amazon", `https://www.amazon.com/s?k=${query}+mp3`, "MP3", null);
  push(
    "soundcloud",
    `https://soundcloud.com/search?q=${query}`,
    "Stream / free DL?",
    null,
    "free",
    "search",
  );
  push(
    "youtube",
    `https://music.youtube.com/search?q=${query}`,
    "Stream",
    null,
    "free",
    "stream",
  );

  return offers;
}
