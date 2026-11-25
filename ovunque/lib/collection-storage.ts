import type { Track } from "./types";

const LEGACY_IDS_KEY = "ovunque.collezione.v1";
const WISHLIST_KEY = "diglist.wishlist.v1";

export type WishlistEntry = {
  id: string;
  savedAt: string;
  track: Track;
};

function isTrack(x: unknown): x is Track {
  if (!x || typeof x !== "object") return false;
  const t = x as Track;
  return (
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    typeof t.artist === "string" &&
    Array.isArray(t.offers)
  );
}

export function readWishlist(): WishlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((row): row is WishlistEntry => {
        if (!row || typeof row !== "object") return false;
        const e = row as WishlistEntry;
        return typeof e.id === "string" && isTrack(e.track);
      });
    }

    // Migrate old id-only crate → empty track stubs (wishlist page fills from catalog)
    const legacy = localStorage.getItem(LEGACY_IDS_KEY);
    if (!legacy) return [];
    const ids = JSON.parse(legacy) as unknown;
    if (!Array.isArray(ids)) return [];
    const migrated: WishlistEntry[] = ids
      .filter((id): id is string => typeof id === "string")
      .map((id) => ({
        id,
        savedAt: new Date().toISOString(),
        track: {
          id,
          title: id,
          artist: "—",
          label: "—",
          genre: "Electronic",
          year: new Date().getFullYear(),
          mood: "",
          coverHue: 160,
          suggested: false,
          rails: [],
          offers: [],
        },
      }));
    writeWishlist(migrated);
    return migrated;
  } catch {
    return [];
  }
}

export function writeWishlist(entries: WishlistEntry[]): void {
  if (typeof window === "undefined") return;
  const dedup = new Map<string, WishlistEntry>();
  for (const e of entries) dedup.set(e.id, e);
  const list = Array.from(dedup.values());
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  // keep legacy ids in sync for any old readers
  localStorage.setItem(
    LEGACY_IDS_KEY,
    JSON.stringify(list.map((e) => e.id)),
  );
}

/** @deprecated use readWishlist */
export function readCollectionIds(): string[] {
  return readWishlist().map((e) => e.id);
}

/** @deprecated use writeWishlist */
export function writeCollectionIds(ids: string[]): void {
  const current = readWishlist();
  const keep = current.filter((e) => ids.includes(e.id));
  const missing = ids.filter((id) => !keep.some((e) => e.id === id));
  writeWishlist([
    ...keep,
    ...missing.map((id) => ({
      id,
      savedAt: new Date().toISOString(),
      track: {
        id,
        title: id,
        artist: "—",
        label: "—",
        genre: "Electronic",
        year: new Date().getFullYear(),
        mood: "",
        coverHue: 160,
        suggested: false,
        rails: [],
        offers: [],
      } satisfies Track,
    })),
  ]);
}
