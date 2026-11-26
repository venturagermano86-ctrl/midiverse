import { scoutDiscogsGraph } from "../lib/live/discogsScout";
import type { Track } from "../lib/types";

async function run(name: string, seeds: Track[]) {
  const t0 = Date.now();
  const r = await scoutDiscogsGraph(seeds, 40, "short");
  const ms = Date.now() - t0;
  const labels = Array.from(
    new Set(r.tracks.map((t) => t.label).filter(Boolean)),
  ) as string[];
  const artists = Array.from(new Set(r.tracks.map((t) => t.artist)));
  console.log(
    JSON.stringify(
      {
        name,
        ms,
        nodes: r.nodes,
        note: r.note,
        sample: r.tracks
          .slice(0, 12)
          .map((t) => `${t.artist} — ${t.title} [${t.label}]`),
        labels: labels.slice(0, 25),
        artists: artists.slice(0, 18),
        hasPerlon: labels.some((l) => /perlon/i.test(l || "")),
        hasAllInn: labels.some((l) => /all\s*inn/i.test(l || "")),
        hasRawax: labels.some((l) => /rawax/i.test(l || "")),
        hasCadenza: labels.some((l) => /cadenza/i.test(l || "")),
      },
      null,
      2,
    ),
  );
}

async function main() {
  // Solo Villalobos prima — evita 429 dal dig Germano
  await run("villalobos", [
    {
      id: "rv-test",
      title: "Heike",
      artist: "Ricardo Villalobos",
      label: "Perlon",
      genre: "Minimal",
    },
  ]);
  await new Promise((r) => setTimeout(r, 2500));
  await run("germano", [
    {
      id: "gv-test",
      title: "Hold The Mark",
      artist: "Germano Ventura",
      label: "All In Record",
      genre: "Minimal",
    },
  ]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
