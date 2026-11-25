"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readWishlist,
  writeWishlist,
  type WishlistEntry,
} from "@/lib/collection-storage";
import { getTrack } from "@/lib/catalog";
import type { Track } from "@/lib/types";

type CollectionCtx = {
  ids: string[];
  entries: WishlistEntry[];
  tracks: Track[];
  count: number;
  has: (id: string) => boolean;
  /** Salva in wishlist (passa la traccia intera se puoi). */
  add: (trackOrId: Track | string) => void;
  remove: (id: string) => void;
  toggle: (trackOrId: Track | string) => void;
  clear: () => void;
  ready: boolean;
};

const Ctx = createContext<CollectionCtx | null>(null);

function resolveTrack(trackOrId: Track | string): Track {
  if (typeof trackOrId !== "string") return trackOrId;
  return (
    getTrack(trackOrId) ?? {
      id: trackOrId,
      title: trackOrId,
      artist: "—",
      label: "—",
      genre: "Electronic",
      year: new Date().getFullYear(),
      mood: "",
      coverHue: 160,
      suggested: false,
      rails: [],
      offers: [],
    }
  );
}

async function syncServerAdd(track: Track) {
  try {
    await fetch("/api/wishlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ track }),
    });
  } catch {
    /* local wishlist is source of truth offline */
  }
}

async function syncServerRemove(trackId: string) {
  try {
    await fetch(`/api/wishlist?trackId=${encodeURIComponent(trackId)}`, {
      method: "DELETE",
    });
  } catch {
    /* ignore */
  }
}

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const local = readWishlist();
    // Enrich stubs from curated catalog
    const enriched = local.map((e) => {
      const curated = getTrack(e.id);
      if (curated && (e.track.offers.length === 0 || e.track.title === e.id)) {
        return { ...e, track: curated };
      }
      return e;
    });
    setEntries(enriched);
    writeWishlist(enriched);
    setReady(true);

    // Pull server wishlist when signed in (merge)
    (async () => {
      try {
        const res = await fetch("/api/wishlist");
        if (!res.ok) return;
        const data = (await res.json()) as {
          items?: Array<{ track_id: string; track: Track; saved_at?: string }>;
        };
        if (!Array.isArray(data.items) || data.items.length === 0) return;
        setEntries((prev) => {
          const map = new Map(prev.map((e) => [e.id, e]));
          for (const item of data.items!) {
            const track = item.track;
            if (!track?.id) continue;
            map.set(track.id, {
              id: track.id,
              savedAt: item.saved_at ?? new Date().toISOString(),
              track,
            });
          }
          const next = Array.from(map.values());
          writeWishlist(next);
          return next;
        });
      } catch {
        /* stay local */
      }
    })();
  }, []);

  const persist = useCallback((next: WishlistEntry[]) => {
    setEntries(next);
    writeWishlist(next);
  }, []);

  const add = useCallback(
    (trackOrId: Track | string) => {
      const track = resolveTrack(trackOrId);
      const entry: WishlistEntry = {
        id: track.id,
        savedAt: new Date().toISOString(),
        track,
      };
      persist([entry, ...entries.filter((e) => e.id !== track.id)]);
      void syncServerAdd(track);
    },
    [entries, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(entries.filter((e) => e.id !== id));
      void syncServerRemove(id);
    },
    [entries, persist],
  );

  const toggle = useCallback(
    (trackOrId: Track | string) => {
      const id = typeof trackOrId === "string" ? trackOrId : trackOrId.id;
      if (entries.some((e) => e.id === id)) remove(id);
      else add(trackOrId);
    },
    [entries, add, remove],
  );

  const clear = useCallback(() => {
    const ids = entries.map((e) => e.id);
    persist([]);
    for (const id of ids) void syncServerRemove(id);
  }, [entries, persist]);

  const value = useMemo<CollectionCtx>(
    () => ({
      ids: entries.map((e) => e.id),
      entries,
      tracks: entries.map((e) => e.track),
      count: entries.length,
      has: (id: string) => entries.some((e) => e.id === id),
      add,
      remove,
      toggle,
      clear,
      ready,
    }),
    [entries, add, remove, toggle, clear, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCollection(): CollectionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useCollection va usato dentro CollectionProvider");
  }
  return ctx;
}

/** Alias chiaro per wishlist */
export function useWishlist(): CollectionCtx {
  return useCollection();
}
