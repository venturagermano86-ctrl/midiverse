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
  readCollectionIds,
  writeCollectionIds,
} from "@/lib/collection-storage";

type CollectionCtx = {
  ids: string[];
  count: number;
  has: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  ready: boolean;
};

const Ctx = createContext<CollectionCtx | null>(null);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(readCollectionIds());
    setReady(true);
  }, []);

  const persist = useCallback((next: string[]) => {
    setIds(next);
    writeCollectionIds(next);
  }, []);

  const add = useCallback(
    (id: string) => {
      persist([...ids.filter((x) => x !== id), id]);
    },
    [ids, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(ids.filter((x) => x !== id));
    },
    [ids, persist],
  );

  const toggle = useCallback(
    (id: string) => {
      if (ids.includes(id)) remove(id);
      else add(id);
    },
    [ids, add, remove],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const value = useMemo<CollectionCtx>(
    () => ({
      ids,
      count: ids.length,
      has: (id: string) => ids.includes(id),
      add,
      remove,
      toggle,
      clear,
      ready,
    }),
    [ids, add, remove, toggle, clear, ready],
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
