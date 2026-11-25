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
        Underground · house · minimal · techno
      </p>
      <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-mist md:text-4xl">
        Charts
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-soft">
        Stile deejay.de: digitali e vinili <strong className="text-mist">nella stessa chart</strong>.
        Digi = prezzo download · 12&quot; = disco + spedizione. Clicchi il prezzo e apri il tab
        giusto.
      </p>
      <div className="mt-8">
        <LiveChartPanel fallback={fallback} />
      </div>
    </main>
  );
}
