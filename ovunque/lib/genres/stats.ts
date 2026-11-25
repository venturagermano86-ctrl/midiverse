import { TRACKS } from "../catalog";
import type { Track } from "../types";
import {
  ALL_GENRES,
  GENRE_FAMILIES,
  getGenre,
  resolveGenre,
  type GenreFamily,
  type GenreNode,
} from "./taxonomy";

export function trackGenre(track: Track): GenreNode {
  return resolveGenre(track.genre);
}

export function tracksInGenre(slug: string): Track[] {
  const node = getGenre(slug);
  if (!node) return [];
  return TRACKS.filter((t) => resolveGenre(t.genre).slug === node.slug);
}

export function tracksInFamily(familySlug: string): Track[] {
  return TRACKS.filter((t) => resolveGenre(t.genre).familySlug === familySlug);
}

export type GenreStat = {
  genre: GenreNode;
  count: number;
};

export type FamilyStat = {
  family: GenreFamily;
  count: number;
  genres: GenreStat[];
};

/** Directory completa: tutte le lane Beatport-style, anche a conteggio 0. */
export function genreDirectory(): FamilyStat[] {
  const counts = new Map<string, number>();
  for (const t of TRACKS) {
    const g = resolveGenre(t.genre);
    counts.set(g.slug, (counts.get(g.slug) ?? 0) + 1);
  }

  return GENRE_FAMILIES.map((family) => {
    const genres = family.genres.map((genre) => ({
      genre,
      count: counts.get(genre.slug) ?? 0,
    }));
    return {
      family,
      count: genres.reduce((s, g) => s + g.count, 0),
      genres,
    };
  });
}

export function genreNavList(): GenreNode[] {
  return ALL_GENRES;
}

export function allGenreFilterLabels(): string[] {
  return ["Tutti", ...ALL_GENRES.map((g) => g.name)];
}
