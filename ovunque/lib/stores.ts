import type { StoreId, StoreMeta } from "./types";

/** Registro portali monitorati dal motore OVUNQUE. */
export const STORES: Record<StoreId, StoreMeta> = {
  beatport: {
    id: "beatport",
    name: "Beatport",
    short: "BP",
    kind: "shop",
    blurb: "Store DJ — WAV / AIFF",
  },
  bandcamp: {
    id: "bandcamp",
    name: "Bandcamp",
    short: "BC",
    kind: "hybrid",
    blurb: "Artist-direct, spesso FLAC / name-your-price",
  },
  traxsource: {
    id: "traxsource",
    name: "Traxsource",
    short: "TX",
    kind: "shop",
    blurb: "House / soulful / disco",
  },
  juno: {
    id: "juno",
    name: "Juno Download",
    short: "JN",
    kind: "shop",
    blurb: "Catalogo ampio, MP3 / WAV",
  },
  whatpeopleplay: {
    id: "whatpeopleplay",
    name: "WhatPeoplePlay",
    short: "WPP",
    kind: "shop",
    blurb: "Selezione underground",
  },
  boomkat: {
    id: "boomkat",
    name: "Boomkat",
    short: "BK",
    kind: "shop",
    blurb: "Experimental / leftfield",
  },
  bleep: {
    id: "bleep",
    name: "Bleep",
    short: "BL",
    kind: "shop",
    blurb: "Warp / electronic boutique",
  },
  clone: {
    id: "clone",
    name: "Clone Digital",
    short: "CL",
    kind: "shop",
    blurb: "Electro / house / techno",
  },
  hardwax: {
    id: "hardwax",
    name: "Hardwax",
    short: "HW",
    kind: "shop",
    blurb: "Berlin techno / dub",
  },
  apple: {
    id: "apple",
    name: "Apple Music",
    short: "AM",
    kind: "shop",
    blurb: "Download AAC",
  },
  amazon: {
    id: "amazon",
    name: "Amazon Digital",
    short: "AZ",
    kind: "shop",
    blurb: "MP3 store",
  },
  soundcloud: {
    id: "soundcloud",
    name: "SoundCloud",
    short: "SC",
    kind: "free",
    blurb: "Download gratis quando l’artista lo abilita",
  },
  youtube: {
    id: "youtube",
    name: "YouTube Music / Free",
    short: "YT",
    kind: "free",
    blurb: "A volte free / promo (quando disponibile)",
  },
  freesound: {
    id: "freesound",
    name: "Free artist drop",
    short: "FR",
    kind: "free",
    blurb: "Drop diretto / freebie label",
  },
};

export const STORE_ORDER: StoreId[] = Object.keys(STORES) as StoreId[];

export function storeName(id: string): string {
  return STORES[id as StoreId]?.name ?? id;
}

export function storeMeta(id: StoreId): StoreMeta {
  return STORES[id];
}
