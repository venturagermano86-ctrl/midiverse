import Link from "next/link";
import { TrackRail } from "@/components/TrackRail";
import { RAILS, tracksForRail } from "@/lib/catalog";

export default function HomePage() {
  return (
    <main>
      <section className="relative min-h-[72vh] overflow-hidden">
        <div className="hero-plane absolute inset-0 animate-drift" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />

        <div className="relative z-10 flex min-h-[72vh] flex-col justify-end px-5 pb-16 pt-24 md:px-10 md:pb-20">
          <p className="animate-rise font-display text-[clamp(3.5rem,14vw,9rem)] font-extrabold leading-[0.85] tracking-tight text-mist">
            OVUNQUE
          </p>
          <p
            className="mt-6 max-w-md animate-rise text-base text-mist/70 md:text-lg"
            style={{ animationDelay: "120ms" }}
          >
            Musica acquistabile da Beatport, Bandcamp e tutti i portali — un posto solo. Vedi dove si
            vende e paga il meno possibile.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-rise" style={{ animationDelay: "220ms" }}>
            <a
              href="#suggerite"
              className="rounded-sm bg-signal px-5 py-3 text-sm font-bold text-ink transition hover:brightness-110"
            >
              Ascolta i suggerimenti
            </a>
            <Link
              href="/cerca"
              className="rounded-sm border border-white/20 px-5 py-3 text-sm font-semibold text-mist transition hover:border-signal/60 hover:text-signal"
            >
              Esplora il catalogo
            </Link>
          </div>
        </div>
      </section>

      <div id="suggerite" className="space-y-14 py-14">
        {RAILS.map((rail) => (
          <TrackRail
            key={rail.id}
            title={rail.title}
            subtitle={rail.subtitle}
            tracks={tracksForRail(rail.id)}
          />
        ))}
      </div>
    </main>
  );
}
