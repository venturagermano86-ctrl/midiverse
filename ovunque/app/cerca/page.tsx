"use client";

import { Suspense } from "react";
import { LiveSearch } from "@/components/LiveSearch";

export default function SearchPage() {
  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-signal">
        Live catalog
      </p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-mist md:text-4xl">Tracks</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Cerca tracce vere e aprirle su Beatport, Bandcamp e tutti gli altri portali. Sotto: pick
        OVUNQUE.
      </p>
      <Suspense fallback={<p className="mt-8 text-muted">Carico ricerca…</p>}>
        <LiveSearch />
      </Suspense>
    </main>
  );
}
