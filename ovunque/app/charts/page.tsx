import { LiveChartPanel } from "@/components/LiveChartPanel";
import { topChart } from "@/lib/charts";

export const metadata = {
  title: "Charts — Dig List",
  description:
    "Underground house / minimal / techno charts — digital and vinyl mixed, deejay.de style.",
};

export default function ChartsPage() {
  const fallback = topChart(16);

  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
        Community · underground
      </p>
      <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-mist md:text-4xl">
        Charts
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-soft">
        <strong className="text-mist">Most wishlisted</strong>: più gli utenti salvano un disco,
        più sale in classifica. Poi lane house / minimal / techno stile deejay.de — digi + 12&quot;
        misti.
      </p>
      <div className="mt-8">
        <LiveChartPanel fallback={fallback} />
      </div>
    </main>
  );
}
