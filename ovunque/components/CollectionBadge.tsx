"use client";

import Link from "next/link";
import { useCollection } from "@/components/CollectionProvider";

export function CollectionBadge() {
  const { count, ready } = useCollection();

  return (
    <Link
      href="/wishlist"
      className="relative inline-flex shrink-0 items-center gap-2 rounded-dig border border-line px-3 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-muted transition hover:border-signal hover:text-signal"
    >
      Wishlist
      {ready && count > 0 ? (
        <span className="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full bg-signal px-1 text-[0.65rem] font-black text-ink">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
