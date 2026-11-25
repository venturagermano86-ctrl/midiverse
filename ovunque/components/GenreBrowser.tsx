import Link from "next/link";
import { genreDirectory } from "@/lib/genres";

export function GenreBrowser() {
  const families = genreDirectory();

  return (
    <div className="space-y-14">
      {families.map((block) => (
        <section key={block.family.slug} id={block.family.slug} className="scroll-mt-24">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
            <div>
              <p
                className="text-[0.65rem] font-bold uppercase tracking-[0.22em]"
                style={{ color: `hsl(${block.family.hue} 70% 55%)` }}
              >
                {block.family.name}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-mist md:text-3xl">
                {block.family.name}
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted">{block.family.blurb}</p>
            </div>
            <Link
              href={`/generi/${block.family.genres[0]?.slug ?? block.family.slug}`}
              className="text-[0.65rem] font-bold uppercase tracking-wider text-signal"
            >
              {block.genres.length} lanes · {block.count} curated
            </Link>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {block.genres.map(({ genre, count }) => (
              <li key={genre.slug}>
                <Link
                  href={`/generi/${genre.slug}`}
                  className="group flex h-full flex-col border border-line bg-panel px-4 py-4 transition hover:border-signal/45 hover:bg-row"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="font-display text-[0.65rem] font-bold tracking-[0.16em] text-muted"
                      style={{ color: `hsl(${genre.hue} 55% 58%)` }}
                    >
                      {genre.code}
                    </span>
                    <span className="text-[0.65rem] tabular-nums text-muted">
                      {count > 0 ? `${count} in crate` : "Live search"}
                    </span>
                  </div>
                  <span className="mt-2 font-display text-lg font-bold text-mist group-hover:text-signal">
                    {genre.name}
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs text-muted">{genre.blurb}</span>
                  {genre.bpmHint ? (
                    <span className="mt-3 text-[0.65rem] uppercase tracking-wider text-muted/80">
                      BPM {genre.bpmHint}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
