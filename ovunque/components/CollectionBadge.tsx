"use client";

import Link from "next/link";
import { useCollection } from "@/components/CollectionProvider";

export function CollectionBadge() {
  const { count, ready } = useCollection();

  return (
    <Link
      href="/collezione"
      className="relative shrink-0 border border-line px-3 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-muted transition hover:border-signal hover:text-signal"
    >
      Crate
      {ready && count > 0 ? (
        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center bg-signal px-1 text-[0.65rem] text-ink">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
