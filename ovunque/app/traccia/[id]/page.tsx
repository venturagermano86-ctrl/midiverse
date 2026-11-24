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
import { itunesLookup } from "@/lib/live/itunes";
import { scanTrack } from "@/lib/scanners/engine";
import { storeName } from "@/lib/stores";
import type { Track } from "@/lib/types";

type Props = { params: { id: string } };

export const dynamicParams = true;

export function generateStaticParams() {
  return TRACKS.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: Props) {
  const track =
    getTrack(params.id) ??
    (params.id.startsWith("itunes") ? await itunesLookup(params.id) : null);
  if (!track) return { title: "Track — OVUNQUE" };
  return {
    title: `${track.title} — ${track.artist} | OVUNQUE`,
    description: `Buy ${track.title} on Beatport, Bandcamp and more.`,
  };
}

async function resolveTrack(id: string): Promise<Track | null> {
  const curated = getTrack(id);
  if (curated) return curated;
  if (id.startsWith("itunes")) return itunesLookup(id);
  return null;
}

export default async function TrackPage({ params }: Props) {
  const track = await resolveTrack(params.id);
  if (!track) notFound();

  const offers = sortedOffers(track);
  const best = cheapestOffer(track);
  if (!best) notFound();

  const exclusive = offers.length === 1;
  const isFree = best.kind === "free" || best.priceEur === 0;
  const report = scanTrack(track);
  const paidKnown = offers.filter(
    (o) => o.kind === "paid" && o.priceEur != null && o.priceEur > 0,
  ).length;
  const similar = findSimilar(track.id, 8);
  const together = frequentlyTogether(track.id, 4);
  const bandcampOffer = offers.find((o) => o.storeId === "bandcamp");
  const beatportOffer = offers.find((o) => o.storeId === "beatport");
  const isLive = track.source === "itunes" || track.id.startsWith("itunes");

  return (
    <main className="px-4 py-8 md:px-8 md:py-10">
      <Link
        href="/charts"
        className="text-xs font-bold uppercase tracking-wider text-muted hover:text-signal"
      >
        ← Charts
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-14">
        <div>
          <CoverArt
            hue={track.coverHue}
            title={track.title}
            artworkUrl={track.artworkUrl}
            className="aspect-square w-full max-w-sm border border-line shadow-2xl shadow-black/50"
          />
          <WaveformStrip className="mt-4 max-w-sm" />
          {track.previewUrl ? (
            <audio controls className="mt-4 w-full max-w-sm" src={track.previewUrl} preload="none">
              Preview
            </audio>
          ) : null}
        </div>

        <div className="space-y-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-signal">
                {track.genre}
              </p>
              {isLive ? (
                <span className="bg-signal px-2 py-0.5 text-[0.65rem] font-bold uppercase text-ink">
                  Live track
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-mist md:text-5xl">
              {track.title}
            </h1>
            <p className="mt-2 text-xl text-bandcamp">{track.artist}</p>
            <p className="mt-1 text-sm text-muted">
              {track.label} · {track.year}
            </p>

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
                  <p className="text-sm font-bold text-signal">Free download path</p>
                  <p className="mt-2 font-display text-2xl font-bold text-mist">
                    {storeName(best.storeId)} · Gratis
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted">
                    Collegata a <strong className="text-mist">{offers.length} store reali</strong>
                    {paidKnown ? ` · ${paidKnown} con prezzo noto` : ""}
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold text-mist">
                    {formatPrice(best.priceEur, best.kind)}{" "}
                    <span className="text-base font-semibold text-signal">
                      · {storeName(best.storeId)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Beatport / Bandcamp / Juno ecc. aprono la ricerca sulla traccia vera — il prezzo
                    lo conferma lo store.
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
                {beatportOffer ? (
                  <a
                    href={beatportOffer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-line px-4 py-3 text-sm font-semibold text-mist hover:border-signal hover:text-signal"
                  >
                    Beatport
                  </a>
                ) : null}
                {bandcampOffer ? (
                  <a
                    href={bandcampOffer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-bandcamp/40 px-4 py-3 text-sm font-semibold text-bandcamp hover:bg-bandcamp/10"
                  >
                    Bandcamp
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

      {similar.length > 0 || together.length > 0 ? (
        <div className="mt-16 space-y-14">
          <SimilarRail
            title="Fans also bought"
            subtitle="Simili dal catalogo OVUNQUE"
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
      ) : null}
    </main>
  );
}
