import Link from "next/link";
import { GenreBrowser } from "@/components/GenreBrowser";
import { GENRE_FAMILIES } from "@/lib/genres";

export const metadata = {
  title: "Genres — OVUNQUE",
  description:
    "Browse Bandcamp digger tags, Beatport chart lanes and Discogs Electronic styles — then compare store prices.",
};

export default function GeneriPage() {
  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-bandcamp">
        Taxonomy
      </p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-mist md:text-4xl">
        Genres
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Tag Bandcamp digger + Beatport charts + Discogs styles: famiglie, sottogeneri, BPM
        tipici. Entra in una lane, cerca live, confronta i prezzi sugli store.
      </p>

      <nav className="mt-6 flex flex-wrap gap-1.5">
        {GENRE_FAMILIES.map((f) => (
          <a
            key={f.slug}
            href={`#${f.slug}`}
            className="border border-line px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-muted transition hover:border-signal hover:text-signal"
          >
            {f.name}
          </a>
        ))}
        <Link
          href="/cerca"
          className="bg-signal px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-ink"
        >
          Search all →
        </Link>
      </nav>

      <div className="mt-12">
        <GenreBrowser />
      </div>
    </main>
  );
}
