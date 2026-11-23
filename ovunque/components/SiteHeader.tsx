"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SiteHeader() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/cerca?q=${encodeURIComponent(query)}` : "/cerca");
  }

  return (
    <header className="relative z-20 flex flex-wrap items-center gap-4 px-5 py-5 md:px-10">
      <Link href="/" className="font-display text-xl font-bold tracking-tight text-mist md:text-2xl">
        OVUNQUE
      </Link>
      <form
        onSubmit={onSubmit}
        className="ml-auto flex min-w-[min(100%,18rem)] flex-1 max-w-md items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md"
      >
        <label htmlFor="search" className="sr-only">
          Cerca traccia o artista
        </label>
        <input
          id="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca traccia, artista, label…"
          className="w-full bg-transparent text-sm text-mist placeholder:text-mist/40 outline-none"
        />
        <button
          type="submit"
          className="shrink-0 text-xs font-semibold uppercase tracking-wider text-signal"
        >
          Cerca
        </button>
      </form>
    </header>
  );
}
