import Link from "next/link";
import { genreCounts } from "@/lib/charts";

export function GenreGrid() {
  const genres = genreCounts();

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {genres.map((g) => (
        <li key={g.genre}>
          <Link
            href={`/cerca?genre=${encodeURIComponent(g.genre)}`}
            className="block border border-line bg-panel px-3 py-4 transition hover:border-signal/50 hover:bg-row"
          >
            <span className="font-display text-sm font-bold text-mist">{g.genre}</span>
            <span className="mt-1 block text-[0.65rem] uppercase tracking-wider text-muted">
              {g.count} track{g.count === 1 ? "" : "s"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
