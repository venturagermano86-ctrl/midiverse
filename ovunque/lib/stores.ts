import type { StoreId, StoreMeta } from "./types";

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
    blurb: "Artist-direct, FLAC / vinyl",
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
    blurb: "Digital MP3 / WAV",
  },
  juno_vinyl: {
    id: "juno_vinyl",
    name: "Juno Records",
    short: "JV",
    kind: "shop",
    blurb: "Vinyl online",
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
    blurb: "Experimental / vinyl + digi",
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
    blurb: "Berlin techno / vinyl",
  },
  decks: {
    id: "decks",
    name: "Decks.de",
    short: "DK",
    kind: "shop",
    blurb: "Vinyl + digital EU",
  },
  deejay: {
    id: "deejay",
    name: "deejay.de",
    short: "DJ",
    kind: "shop",
    blurb: "Vinyl shop Frankfurt",
  },
  roughtrade: {
    id: "roughtrade",
    name: "Rough Trade",
    short: "RT",
    kind: "shop",
    blurb: "Indie / vinyl shop",
  },
  discogs: {
    id: "discogs",
    name: "Discogs Marketplace",
    short: "DG",
    kind: "shop",
    blurb: "Marketplace vinile",
  },
  hhv: {
    id: "hhv",
    name: "HHV",
    short: "HH",
    kind: "shop",
    blurb: "Vinyl shop Berlin",
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
    blurb: "Solo se free download abilitato",
  },
  youtube: {
    id: "youtube",
    name: "YouTube Music",
    short: "YT",
    kind: "free",
    blurb: "Stream",
  },
  freesound: {
    id: "freesound",
    name: "Free artist drop",
    short: "FR",
    kind: "free",
    blurb: "Drop diretto / freebie",
  },
};

export const STORE_ORDER: StoreId[] = Object.keys(STORES) as StoreId[];

export const VINYL_STORES: StoreId[] = [
  "deejay",
  "decks",
  "discogs",
  "juno_vinyl",
  "hardwax",
  "boomkat",
  "hhv",
  "roughtrade",
  "bandcamp",
];

export function storeName(id: string): string {
  return STORES[id as StoreId]?.name ?? id;
}

export function storeMeta(id: StoreId): StoreMeta {
  return STORES[id];
}
