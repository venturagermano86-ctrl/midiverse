import { LiveChartPanel } from "@/components/LiveChartPanel";
import { topChart } from "@/lib/charts";

export const metadata = {
  title: "Top Charts — OVUNQUE",
  description: "Live Electronic chart + deep links to Beatport, Bandcamp and more.",
};

export default function ChartsPage() {
  const fallback = topChart(16);

  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-signal">
        Live · Electronic / Dance
      </p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-mist md:text-4xl">
        Top Charts
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Chart reale (iTunes Electronic). Su ogni traccia: Beatport, Bandcamp, Traxsource, Juno,
        WhatPeoplePlay, Boomkat, Bleep, Clone, Hardwax, Decks, Rough Trade, Discogs, Amazon,
        SoundCloud, YouTube — apri lo store e compra lì.
      </p>
      <div className="mt-8">
        <LiveChartPanel fallback={fallback} />
      </div>
    </main>
  );
}
