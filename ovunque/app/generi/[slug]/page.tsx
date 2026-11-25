import Link from "next/link";
import { notFound } from "next/navigation";
import { ChartTable } from "@/components/ChartTable";
import { LiveGenreSearch } from "@/components/LiveGenreSearch";
import {
  ALL_GENRES,
  getGenre,
  tracksInGenre,
  genreSearchTerm,
} from "@/lib/genres";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return ALL_GENRES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: Props) {
  const genre = getGenre(params.slug);
  if (!genre) return { title: "Genre — Dig List" };
  return {
    title: `${genre.name} — Dig List`,
    description: `${genre.blurb}. Confronta prezzi su Beatport, Bandcamp, Decks e altri.`,
  };
}

export default function GenrePage({ params }: Props) {
  const genre = getGenre(params.slug);
  if (!genre) notFound();

  const curated = tracksInGenre(genre.slug);
  const siblings = ALL_GENRES.filter(
    (g) => g.familySlug === genre.familySlug && g.slug !== genre.slug,
  );

  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <Link
        href="/generi"
        className="text-xs font-bold uppercase tracking-wider text-muted hover:text-signal"
      >
        ← All genres
      </Link>

      <p
        className="mt-6 text-[0.65rem] font-bold uppercase tracking-[0.18em]"
        style={{ color: `hsl(${genre.hue} 55% 58%)` }}
      >
        {genre.family} · {genre.code}
      </p>
      <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-mist md:text-5xl">
        {genre.name}
      </h1>
      <p className="mt-3 max-w-2xl text-soft">{genre.blurb}</p>
      {genre.bpmHint ? (
        <p className="mt-2 text-xs uppercase tracking-wider text-muted">
          Typical BPM {genre.bpmHint}
        </p>
      ) : null}

      {siblings.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {siblings.map((s) => (
            <Link
              key={s.slug}
              href={`/generi/${s.slug}`}
              className="rounded-dig border border-line px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-muted transition hover:border-signal hover:text-signal"
            >
              {s.name}
            </Link>
          ))}
        </div>
      ) : null}

      <section className="mt-12">
        <h2 className="font-display text-xl font-black text-mist">Live in this lane</h2>
        <p className="mt-1 mb-4 text-sm text-soft">
          Catalogo live filtrato su «{genreSearchTerm(genre)}» — ogni hit apre gli store.
        </p>
        <LiveGenreSearch genreSlug={genre.slug} />
      </section>

      {curated.length > 0 ? (
        <section className="mt-14">
          <h2 className="font-display text-xl font-black text-mist">Curated in Dig List</h2>
          <p className="mt-1 mb-4 text-sm text-soft">{curated.length} picks in this lane</p>
          <ChartTable tracks={curated} showRank={false} />
        </section>
      ) : null}
    </main>
  );
}
