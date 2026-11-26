"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CollectionBadge } from "@/components/CollectionBadge";

const NAV = [
  { href: "/charts", label: "Charts" },
  { href: "/cerca", label: "Tracks" },
  { href: "/generi", label: "Genres" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/account", label: "Account" },
];

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    // /cerca apre Dig start (artista / label / link / YouTube / screenshot)
    router.push(query ? `/cerca?q=${encodeURIComponent(query)}` : "/cerca");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:gap-5 md:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 font-display text-[0.95rem] font-black uppercase tracking-[0.14em] text-mist"
          aria-label="Dig List home"
        >
          <span className="brand-dot" aria-hidden />
          Dig List
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-[0.7rem] font-bold uppercase tracking-[0.14em]">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-dig px-2.5 py-1.5 transition ${
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
          className="order-last flex w-full flex-1 items-center gap-2 rounded-dig border border-line bg-panel px-3 py-2 md:order-none md:ml-auto md:max-w-sm"
        >
          <label htmlFor="search" className="sr-only">
            Search tracks
          </label>
          <input
            id="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Artist, label, title, YouTube…"
            className="w-full bg-transparent text-sm text-mist outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            className="text-[0.65rem] font-bold uppercase tracking-wider text-signal"
          >
            Go
          </button>
        </form>
        <a
          href="https://midivrs.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[0.7rem] font-medium tracking-wide text-soft transition hover:border-signal hover:text-mist lg:inline-flex"
        >
          powered by <b className="font-black tracking-wider text-signal">MIDIVRS</b>
        </a>
        <CollectionBadge />
      </div>
    </header>
  );
}
