import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverArt } from "@/components/CoverArt";
import { ScanPanel } from "@/components/ScanPanel";
import { StoreOffers } from "@/components/StoreOffers";
import {
  cheapestOffer,
  ctaLabel,
  formatPrice,
  getTrack,
  sortedOffers,
  TRACKS,
} from "@/lib/catalog";
import { scanTrack } from "@/lib/scanners/engine";
import { storeName } from "@/lib/stores";

type Props = { params: { id: string } };

export function generateStaticParams() {
  return TRACKS.map((t) => ({ id: t.id }));
}

export function generateMetadata({ params }: Props) {
  const track = getTrack(params.id);
  if (!track) return { title: "Traccia — OVUNQUE" };
  return {
    title: `${track.title} — ${track.artist} | OVUNQUE`,
    description: `Confronta free e prezzi di ${track.title} su ${track.offers.length} portali.`,
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

  return (
    <main className="px-5 py-8 md:px-10 md:py-12">
      <Link href="/" className="text-sm text-mist/45 transition hover:text-signal">
        ← Torna ai suggerimenti
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
        <CoverArt
          hue={track.coverHue}
          title={track.title}
          className="aspect-square w-full max-w-sm animate-rise rounded-sm shadow-2xl shadow-black/40"
        />

        <div className="space-y-8">
          <div className="animate-rise" style={{ animationDelay: "80ms" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-signal">
              {track.genre}
              {track.bpm ? ` · ${track.bpm} BPM` : ""}
              {track.key ? ` · ${track.key}` : ""}
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-mist md:text-5xl">
              {track.title}
            </h1>
            <p className="mt-2 text-lg text-mist/70">{track.artist}</p>
            <p className="mt-1 text-sm text-mist/40">
              {track.label} · {track.year}
              {track.isrc ? ` · ${track.isrc}` : ""}
            </p>

            <div
              className={`mt-6 rounded-sm border p-5 ${
                isFree
                  ? "border-signal/40 bg-signal/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {isFree ? (
                <>
                  <p className="text-sm font-semibold text-signal">
                    Scarica gratis — meglio di Bandcamp
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold text-mist">
                    {storeName(best.storeId)} · Gratis
                  </p>
                  {paidCount > 0 && (
                    <p className="mt-1 text-sm text-mist/55">
                      Stessa traccia anche a pagamento su {paidCount} portali — free vince.
                    </p>
                  )}
                </>
              ) : exclusive ? (
                <>
                  <p className="text-sm text-ember">Disponibile solo su un portale</p>
                  <p className="mt-2 font-display text-2xl font-bold text-mist">
                    {storeName(best.storeId)} · {formatPrice(best.priceEur)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-mist/55">
                    In vendita su <strong className="text-mist">{offers.length} portali</strong>
                    {" · "}nessun free trovato
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold text-mist">
                    Da {formatPrice(best.priceEur)}{" "}
                    <span className="text-base font-semibold text-signal">
                      su {storeName(best.storeId)}
                    </span>
                  </p>
                </>
              )}
              <a
                href={best.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex rounded-sm bg-signal px-5 py-3 text-sm font-bold text-ink transition hover:brightness-110"
              >
                {ctaLabel(best, exclusive)}
              </a>
            </div>
          </div>

          <StoreOffers offers={offers} />
          <ScanPanel report={report} />
        </div>
      </div>
    </main>
  );
}
