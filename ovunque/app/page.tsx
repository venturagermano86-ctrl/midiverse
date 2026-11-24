import Link from "next/link";
import { GenreGrid } from "@/components/GenreGrid";
import { HomeCollectionRecs } from "@/components/HomeCollectionRecs";
import { LiveChartPanel } from "@/components/LiveChartPanel";
import { TrackRail } from "@/components/TrackRail";
import { WaveformStrip } from "@/components/WaveformStrip";
import { tracksForRail } from "@/lib/catalog";
import { topChart } from "@/lib/charts";
import { STORE_ORDER } from "@/lib/stores";

export default function HomePage() {
  const fallback = topChart(10);

  return (
    <main>
      <section className="relative min-h-[68vh] overflow-hidden border-b border-line">
        <div className="hero-plane absolute inset-0 animate-drift" aria-hidden />
        <div className="relative z-10 flex min-h-[68vh] flex-col justify-end px-4 pb-14 pt-20 md:px-8 md:pb-16">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-signal">
            Live stores · Beatport · Bandcamp · Juno · {STORE_ORDER.length} portals
          </p>
          <h1 className="mt-3 animate-rise font-display text-[clamp(3.2rem,12vw,7.5rem)] font-extrabold leading-[0.88] tracking-tight text-mist">
            OVUNQUE
          </h1>
          <p
            className="mt-5 max-w-lg animate-rise text-base text-muted md:text-lg"
            style={{ animationDelay: "100ms" }}
          >
            Chart e ricerca su tracce reali. Ogni hit apre i negozi veri: Beatport, Bandcamp,
            Traxsource, Juno e gli altri — free o il prezzo che trovi sullo store.
          </p>
          <WaveformStrip className="mt-8 max-w-xl animate-rise" />
          <div className="mt-8 flex flex-wrap gap-3 animate-rise" style={{ animationDelay: "180ms" }}>
            <Link
              href="/charts"
              className="bg-signal px-5 py-3 text-sm font-bold text-ink transition hover:brightness-110"
            >
              Open live charts
            </Link>
            <Link
              href="/cerca"
              className="border border-line px-5 py-3 text-sm font-semibold text-mist transition hover:border-signal hover:text-signal"
            >
              Search real tracks
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-line px-4 py-12 md:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-signal">Charts</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-mist md:text-3xl">
              Top Electronic
            </h2>
            <p className="mt-1 text-sm text-muted">
              Live chart + link diretti agli store
            </p>
          </div>
          <Link href="/charts" className="text-xs font-bold uppercase tracking-wider text-signal">
            Full chart →
          </Link>
        </div>
        <LiveChartPanel fallback={fallback} />
      </section>

      <section className="border-b border-line px-4 py-12 md:px-8">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-bandcamp">Genres</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-mist md:text-3xl">Shop by genre</h2>
        <p className="mt-1 mb-6 text-sm text-muted">House, techno e gli altri — poi apri i portali</p>
        <GenreGrid />
      </section>

      <div className="space-y-12 py-12">
        <HomeCollectionRecs />
        <TrackRail
          title="Free downloads"
          subtitle="SoundCloud free quando c’è — altrimenti store a pagamento"
          tracks={tracksForRail("gratis")}
        />
        <TrackRail
          title="New OVUNQUE picks"
          subtitle="Tracce inventate / curate in più — sempre multi-store"
          tracks={tracksForRail("novita")}
        />
      </div>
    </main>
  );
}
