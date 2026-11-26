import { NextResponse } from "next/server";
import { itunesSearch } from "@/lib/live/itunes";
import { resolveStartInput } from "@/lib/live/resolveStart";
import { scoutDiscogsGraph } from "@/lib/live/discogsScout";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

/**
 * Parte Diglist da artista / label / testo / link YouTube·Bandcamp·Discogs·Beatport·SC.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    q?: string;
    mode?: "auto" | "artist" | "label";
    limit?: number;
  };
  const q = (body.q || "").trim().slice(0, 500);
  if (!q) {
    return NextResponse.json({ error: "q_required" }, { status: 400 });
  }
  const mode = body.mode === "artist" || body.mode === "label" ? body.mode : "auto";
  const limit = Math.min(36, Math.max(6, Number(body.limit) || 24));

  try {
    const resolved = await resolveStartInput(q, mode);
    if (resolved.queries.length === 0 && !resolved.labelHint && !resolved.artistHint) {
      return NextResponse.json({
        ...resolved,
        tracks: [],
        count: 0,
        note: "Niente da cercare — incolla artista, label, link o YouTube",
      });
    }

    const tracks: Track[] = [];
    const seen = new Set<string>();

    // Label-first: rete Discogs (All Inn / Perlon…)
    if (resolved.kind === "label" || resolved.labelHint) {
      const label = resolved.labelHint || resolved.queries[0];
      const seed: Track = {
        id: `start-label-${label.slice(0, 24)}`,
        title: "Label dig",
        artist: "Various",
        label,
        genre: "Minimal",
        year: new Date().getFullYear(),
        mood: "club",
        coverHue: 200,
        suggested: true,
        rails: ["per-te"],
        offers: [],
        source: "live",
      };
      try {
        const dg = await scoutDiscogsGraph([seed], limit, "short");
        for (const t of dg.tracks) {
          if (seen.has(t.id)) continue;
          seen.add(t.id);
          tracks.push(t);
        }
      } catch {
        /* fall through to iTunes */
      }
    }

    // Artisti All Inn (Gaskin…) senza labelHint → apri comunque rete Discogs All Inn
    const ALL_INN_ARTISTS =
      /gaskin|lp\s*rhythm|jk\s*rollin|kolter|coldfish|arkajo|traumer|jaffa|summed|pulpyt|ventura/i;
    if (
      tracks.length < 8 &&
      !resolved.labelHint &&
      ALL_INN_ARTISTS.test(
        `${resolved.artistHint || ""} ${resolved.queries.join(" ")}`,
      )
    ) {
      const artistName = resolved.artistHint || resolved.queries[0] || "Gaskin";
      const seed: Track = {
        id: `start-allinn-${artistName.slice(0, 20)}`,
        title: "All Inn dig",
        artist: artistName,
        label: "All Inn Records",
        genre: "House",
        year: new Date().getFullYear(),
        mood: "club",
        coverHue: 28,
        suggested: true,
        rails: ["per-te"],
        offers: [],
        source: "live",
      };
      try {
        const dg = await scoutDiscogsGraph([seed], limit, "short");
        for (const t of dg.tracks) {
          if (seen.has(t.id)) continue;
          seen.add(t.id);
          tracks.push(t);
          if (tracks.length >= limit) break;
        }
      } catch {
        /* fall through */
      }
    }

    // Artista / testo / link → iTunes (+ query multiple)
    const queries = resolved.queries.length
      ? resolved.queries
      : [resolved.artistHint, resolved.titleHint].filter(Boolean).join(" ")
        ? [[resolved.artistHint, resolved.titleHint].filter(Boolean).join(" ")]
        : [];

    for (const query of queries.slice(0, 3)) {
      if (tracks.length >= limit) break;
      try {
        const hits = await itunesSearch(query, Math.min(20, limit));
        for (const t of hits) {
          if (seen.has(t.id)) continue;
          // Se mode artist, preferisci match artista
          if (
            resolved.kind === "artist" &&
            resolved.artistHint &&
            !t.artist.toLowerCase().includes(resolved.artistHint.toLowerCase().slice(0, 8))
          ) {
            continue;
          }
          seen.add(t.id);
          tracks.push(t);
          if (tracks.length >= limit) break;
        }
      } catch {
        /* next */
      }
    }

    // Se ancora vuoto e abbiamo artistHint, Discogs rete artista
    if (tracks.length < 6 && resolved.artistHint) {
      const seed: Track = {
        id: `start-artist-${resolved.artistHint.slice(0, 24)}`,
        title: resolved.titleHint || "Dig",
        artist: resolved.artistHint,
        label: resolved.labelHint || "—",
        genre: "Minimal",
        year: new Date().getFullYear(),
        mood: "club",
        coverHue: 180,
        suggested: true,
        rails: ["per-te"],
        offers: [],
        source: "live",
      };
      try {
        const dg = await scoutDiscogsGraph([seed], limit, "short");
        for (const t of dg.tracks) {
          if (seen.has(t.id)) continue;
          seen.add(t.id);
          tracks.push(t);
          if (tracks.length >= limit) break;
        }
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({
      kind: resolved.kind,
      queries: resolved.queries,
      artistHint: resolved.artistHint,
      titleHint: resolved.titleHint,
      labelHint: resolved.labelHint,
      note: `${resolved.note} · ${tracks.length} hit`,
      count: tracks.length,
      tracks: tracks.slice(0, limit),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "start_failed";
    return NextResponse.json(
      { error: "start_failed", detail: msg.slice(0, 120), tracks: [] },
      { status: 502 },
    );
  }
}
