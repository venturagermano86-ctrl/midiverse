"use client";

import Link from "next/link";
import { useCollection } from "@/components/CollectionProvider";

export function CollectionBadge() {
  const { count, ready } = useCollection();

  return (
    <Link
      href="/collezione"
      className="relative shrink-0 rounded-sm border border-white/15 px-3 py-2 text-xs font-bold uppercase tracking-wider text-mist/80 transition hover:border-signal/50 hover:text-signal"
    >
      Collezione
      {ready && count > 0 ? (
        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-signal px-1 text-[0.65rem] text-ink">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
