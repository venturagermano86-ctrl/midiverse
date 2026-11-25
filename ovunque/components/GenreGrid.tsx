import Link from "next/link";
import { GENRE_FAMILIES } from "@/lib/genres";

/** Compact family strip for home — full tree lives on /generi. */
export function GenreGrid() {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {GENRE_FAMILIES.map((f) => (
        <li key={f.slug}>
          <Link
            href={`/generi#${f.slug}`}
            className="block border border-line bg-panel px-3 py-4 transition hover:border-signal/50 hover:bg-row"
          >
            <span
              className="text-[0.6rem] font-bold uppercase tracking-[0.18em]"
              style={{ color: `hsl(${f.hue} 65% 55%)` }}
            >
              {f.genres.length} lanes
            </span>
            <span className="mt-1 block font-display text-sm font-bold text-mist">{f.name}</span>
            <span className="mt-1 block line-clamp-2 text-[0.65rem] text-muted">{f.blurb}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
