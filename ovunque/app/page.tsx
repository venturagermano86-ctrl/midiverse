import Link from "next/link";
import { Suspense } from "react";
import { GenreGrid } from "@/components/GenreGrid";
import { HomeCollectionRecs } from "@/components/HomeCollectionRecs";
import { LiveChartPanel } from "@/components/LiveChartPanel";
import { DigStart } from "@/components/DigStart";
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
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.18em] text-signal">
            Private store · {STORE_ORDER.length} portals
          </p>
          <h1 className="mt-3 max-w-[14em] animate-rise font-display text-[clamp(2.75rem,9vw,5.5rem)] font-black leading-[0.95] tracking-[-0.035em] text-mist">
            From dig to buy.
          </h1>
          <p
            className="mt-5 max-w-lg animate-rise text-base text-soft md:text-lg"
            style={{ animationDelay: "100ms" }}
          >
            Espansione privata di Dig List: cerca tracce e vinili, ascolta, salva in wishlist,
            confronta dove costa meno — Beatport, Bandcamp, Decks, deejay.de e gli altri.
          </p>
          <WaveformStrip className="mt-8 max-w-xl animate-rise" />
          <div
            className="mt-8 flex flex-wrap gap-3 animate-rise"
            style={{ animationDelay: "180ms" }}
          >
            <Link
              href="/cerca"
              className="rounded-dig bg-signal px-5 py-3 text-sm font-bold text-ink transition hover:bg-signal-hi"
            >
              Search tracks
            </Link>
            <Link
              href="/generi"
              className="rounded-dig border border-line px-5 py-3 text-sm font-semibold text-mist transition hover:border-signal hover:text-signal"
            >
              Browse genres
            </Link>
            <Link
              href="/wishlist"
              className="rounded-dig border border-line px-5 py-3 text-sm font-semibold text-mist transition hover:border-signal hover:text-signal"
            >
              Wishlist
            </Link>
          </div>
          <ol className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-soft">
            {[
              "Cerca o apri un chart",
              "Ascolta la preview",
              "Salva in wishlist",
              "Compra al prezzo migliore",
            ].map((step, i) => (
              <li key={step} className="inline-flex items-center gap-2">
                <span className="inline-grid h-[22px] w-[22px] place-items-center rounded-full border border-line text-[0.7rem] font-bold text-signal">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-line px-4 py-12 md:px-8">
        <Suspense fallback={<p className="text-muted">Dig start…</p>}>
          <DigStart />
        </Suspense>
      </section>

      <section className="border-b border-line px-4 py-12 md:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
              Charts
            </p>
            <h2 className="mt-1 font-display text-2xl font-black tracking-tight text-mist md:text-3xl">
              Charts
            </h2>
            <p className="mt-1 text-sm text-soft">
              Most wishlisted · Free downloads · underground — guest ok, login per cronologia
            </p>
          </div>
          <Link
            href="/charts"
            className="text-xs font-bold uppercase tracking-wider text-signal"
          >
            Full chart →
          </Link>
        </div>
        <LiveChartPanel fallback={fallback} />
      </section>

      <section className="border-b border-line px-4 py-12 md:px-8">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
          Taxonomy
        </p>
        <h2 className="mt-1 font-display text-2xl font-black tracking-tight text-mist md:text-3xl">
          Genres like Beatport
        </h2>
        <p className="mt-1 mb-6 text-sm text-soft">
          Famiglie e lane accurate — poi apri i portali
        </p>
        <GenreGrid />
      </section>

      <div className="space-y-12 py-12">
        <HomeCollectionRecs />
        <TrackRail
          title="Free downloads"
          subtitle="Solo se free download reale (SoundCloud / drop) — altrimenti niente opzione fake"
          tracks={tracksForRail("gratis")}
        />
        <TrackRail
          title="New Dig List picks"
          subtitle="Curated multi-store — private sandbox"
          tracks={tracksForRail("novita")}
        />
      </div>
    </main>
  );
}
