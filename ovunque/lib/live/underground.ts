import type { Track } from "../types";
import { itunesSearch } from "./itunes";

/** Lane underground stile deejay.de — house / minimal / deep / techno. */
export const UNDERGROUND_LANES = [
  { id: "all", label: "All underground", query: "house techno minimal deep house" },
  { id: "house", label: "House", query: "house music club" },
  { id: "deep", label: "Deep House", query: "deep house" },
  { id: "minimal", label: "Minimal / Deep Tech", query: "minimal techno deep tech" },
  { id: "techno", label: "Techno", query: "techno peak time" },
  { id: "tech-house", label: "Tech House", query: "tech house" },
  { id: "electro", label: "Electro", query: "electro house detroit" },
] as const;

export type LaneId = (typeof UNDERGROUND_LANES)[number]["id"];

function dedupe(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const t of tracks) {
    const key = `${t.artist.toLowerCase()}|${t.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Chart misti digi+vinyl: merge più query underground. */
export async function undergroundChart(
  lane: LaneId = "all",
  limit = 28,
): Promise<{ lane: LaneId; tracks: Track[]; note: string }> {
  const def =
    UNDERGROUND_LANES.find((l) => l.id === lane) ?? UNDERGROUND_LANES[0];

  if (lane === "all") {
    const batches = await Promise.all(
      UNDERGROUND_LANES.filter((l) => l.id !== "all")
        .slice(0, 5)
        .map((l) => itunesSearch(l.query, 10).catch(() => [] as Track[])),
    );
    const tracks = dedupe(batches.flat()).slice(0, limit);
    return {
      lane: "all",
      tracks,
      note: "Chart underground · house / minimal / deep / techno — digi + 12\" misti (stile deejay.de)",
    };
  }

  const tracks = dedupe(await itunesSearch(def.query, limit)).slice(0, limit);
  return {
    lane: def.id,
    tracks,
    note: `${def.label} chart · prezzi digitali e vinili nella stessa lista`,
  };
}
