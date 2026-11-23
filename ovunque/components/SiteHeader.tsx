"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CollectionBadge } from "@/components/CollectionBadge";

const NAV = [
  { href: "/charts", label: "Charts" },
  { href: "/cerca", label: "Tracks" },
  { href: "/generi", label: "Genres" },
  { href: "/collezione", label: "Collection" },
];

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/cerca?q=${encodeURIComponent(query)}` : "/cerca");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/95 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:gap-5 md:px-8">
        <Link href="/" className="font-display text-lg font-extrabold tracking-tight text-mist md:text-xl">
          OVUNQUE
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-[0.7rem] font-bold uppercase tracking-[0.14em]">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2.5 py-1.5 transition ${
                  active ? "bg-signal text-ink" : "text-muted hover:text-signal"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form
          onSubmit={onSubmit}
          className="order-last flex w-full flex-1 items-center gap-2 border border-line bg-panel px-3 py-2 md:order-none md:ml-auto md:max-w-sm"
        >
          <label htmlFor="search" className="sr-only">
            Search tracks
          </label>
          <input
            id="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, artist, label…"
            className="w-full bg-transparent text-sm text-mist outline-none placeholder:text-muted"
          />
          <button type="submit" className="text-[0.65rem] font-bold uppercase tracking-wider text-signal">
            Go
          </button>
        </form>
        <CollectionBadge />
      </div>
    </header>
  );
}
