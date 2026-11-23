import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCollectionButton } from "@/components/AddToCollectionButton";
import { CoverArt } from "@/components/CoverArt";
import { ScanPanel } from "@/components/ScanPanel";
import { SimilarRail } from "@/components/SimilarRail";
import { StoreOffers } from "@/components/StoreOffers";
import { TrackCard } from "@/components/TrackCard";
import { WaveformStrip } from "@/components/WaveformStrip";
import {
  cheapestOffer,
  ctaLabel,
  formatPrice,
  getTrack,
  sortedOffers,
  TRACKS,
} from "@/lib/catalog";
import { findSimilar, frequentlyTogether } from "@/lib/engines/similar";
import { scanTrack } from "@/lib/scanners/engine";
import { storeName } from "@/lib/stores";

type Props = { params: { id: string } };

export function generateStaticParams() {
  return TRACKS.map((t) => ({ id: t.id }));
}

export function generateMetadata({ params }: Props) {
  const track = getTrack(params.id);
  if (!track) return { title: "Track — OVUNQUE" };
  return {
    title: `${track.title} — ${track.artist} | OVUNQUE`,
    description: `Buy ${track.title} — compare Beatport, Bandcamp and more.`,
  };
}

export default function TrackPage({ params }: Props) {
  const track = getTrack(params.id);
  if (!track) notFound();

  const offers = sortedOffers(track);
  const best = cheapestOffer(track);
  if (!best) notFound();

  const exclusive = offers.length === 1;
  const isFree = best.kind === "free" || best.priceEur === 0;
  const report = scanTrack(track);
  const paidCount = offers.filter((o) => o.kind === "paid" && o.priceEur > 0).length;
  const similar = findSimilar(track.id, 8);
  const together = frequentlyTogether(track.id, 4);
  const bandcampOffer = offers.find((o) => o.storeId === "bandcamp");
  const beatportOffer = offers.find((o) => o.storeId === "beatport");

  return (
    <main className="px-4 py-8 md:px-8 md:py-10">
      <Link href="/charts" className="text-xs font-bold uppercase tracking-wider text-muted hover:text-signal">
        ← Charts
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-14">
        <div>
          <CoverArt
            hue={track.coverHue}
            title={track.title}
            className="aspect-square w-full max-w-sm border border-line shadow-2xl shadow-black/50"
          />
          <WaveformStrip className="mt-4 max-w-sm" />
        </div>

        <div className="space-y-8">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-signal">
              {track.genre}
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-mist md:text-5xl">
              {track.title}
            </h1>
            <p className="mt-2 text-xl text-bandcamp">{track.artist}</p>
            <p className="mt-1 text-sm text-muted">
              {track.label} · {track.year}
            </p>

            {/* Meta grid stile Beatport */}
            <dl className="mt-6 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
              {[
                ["BPM", track.bpm?.toString() ?? "—"],
                ["Key", track.key ?? "—"],
                ["Genre", track.genre],
                ["Stores", String(offers.length)],
              ].map(([k, v]) => (
                <div key={k} className="bg-panel px-3 py-3">
                  <dt className="text-[0.6rem] font-bold uppercase tracking-wider text-muted">{k}</dt>
                  <dd className="mt-1 font-display text-lg font-bold text-mist">{v}</dd>
                </div>
              ))}
            </dl>

            <div
              className={`mt-6 border p-5 ${
                isFree ? "border-signal/50 bg-signal/10" : "border-line bg-panel"
              }`}
            >
              {isFree ? (
                <>
                  <p className="text-sm font-bold text-signal">Free download available</p>
                  <p className="mt-2 font-display text-2xl font-bold text-mist">
                    {storeName(best.storeId)} · Gratis
                  </p>
                  {paidCount > 0 && (
                    <p className="mt-1 text-sm text-muted">
                      Also paid on {paidCount} stores — free wins over Bandcamp pricing.
                    </p>
                  )}
                </>
              ) : exclusive ? (
                <>
                  <p className="text-sm text-ember">Exclusive — one store only</p>
                  <p className="mt-2 font-display text-2xl font-bold text-mist">
                    {storeName(best.storeId)} · {formatPrice(best.priceEur)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted">
                    Best across <strong className="text-mist">{offers.length} stores</strong>
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold text-mist">
                    {formatPrice(best.priceEur)}{" "}
                    <span className="text-base font-semibold text-signal">
                      on {storeName(best.storeId)}
                    </span>
                  </p>
                </>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={best.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex bg-signal px-5 py-3 text-sm font-bold text-ink hover:brightness-110"
                >
                  {ctaLabel(best, exclusive)}
                </a>
                {beatportOffer && best.storeId !== "beatport" ? (
                  <a
                    href={beatportOffer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-line px-4 py-3 text-sm font-semibold text-mist hover:border-signal hover:text-signal"
                  >
                    Beatport · {formatPrice(beatportOffer.priceEur, beatportOffer.kind)}
                  </a>
                ) : null}
                {bandcampOffer && best.storeId !== "bandcamp" ? (
                  <a
                    href={bandcampOffer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-bandcamp/40 px-4 py-3 text-sm font-semibold text-bandcamp hover:bg-bandcamp/10"
                  >
                    Bandcamp · {formatPrice(bandcampOffer.priceEur, bandcampOffer.kind)}
                  </a>
                ) : null}
                <AddToCollectionButton trackId={track.id} />
              </div>
            </div>
          </div>

          <StoreOffers offers={offers} />
          <ScanPanel report={report} />
        </div>
      </div>

      <div className="mt-16 space-y-14">
        <SimilarRail
          title="Fans also bought"
          subtitle="Come Bandcamp discovery + Beatport related tracks"
          hits={similar}
        />
        {together.length > 0 ? (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold text-mist md:text-2xl">
              Frequently bought together
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 md:gap-5">
              {together.map((t, i) => (
                <TrackCard key={t.id} track={t} index={i} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
