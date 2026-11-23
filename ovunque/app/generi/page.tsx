import { GenreGrid } from "@/components/GenreGrid";

export const metadata = {
  title: "Genres — OVUNQUE",
  description: "Browse house, techno and more — Beatport genres, Bandcamp tags.",
};

export default function GeneriPage() {
  return (
    <main className="px-4 py-10 md:px-8 md:py-12">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-bandcamp">Browse</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-mist md:text-4xl">Genres</h1>
      <p className="mt-2 mb-8 max-w-xl text-sm text-muted">
        Entra per genere come su Beatport. Ogni traccia apre i prezzi su tutti i portali.
      </p>
      <GenreGrid />
    </main>
  );
}
