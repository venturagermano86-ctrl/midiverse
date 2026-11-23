import { ChartTable } from "@/components/ChartTable";
import { topChart } from "@/lib/charts";

export const metadata = {
  title: "Top Charts — OVUNQUE",
  description: "Chart stile Beatport: rank, BPM, key, best price across stores.",
};

export default function ChartsPage() {
  const chart = topChart(16);

  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-signal">Beatport energy</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-mist md:text-4xl">Top Charts</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Stessa griglia di un chart DJ: titolo, label, genre, BPM, key — e il prezzo migliore tra
        Beatport, Bandcamp e gli altri.
      </p>
      <div className="mt-8">
        <ChartTable tracks={chart} />
      </div>
    </main>
  );
}
