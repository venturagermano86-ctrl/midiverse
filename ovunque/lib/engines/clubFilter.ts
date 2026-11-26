/**
 * Filtro club underground — tiene dig tipo Gtronic / Villalobos / Perlon,
 * taglia vocal jazz, electro-pop, alternative, folk (Mari solo, Lenta soft…).
 */

import type { Track } from "../types";
import { resolveGenre } from "../genres";

const CLUB_STYLES =
  /^(house|deep house|tech house|techno|minimal|microhouse|acid|dub techno|electro|hard techno|melodic techno|tribal house|progressive house|jackin|garage|uk garage|broken beat)$/i;

const CLUB_GENRE_BLOB =
  /\b(house|techno|minimal|microhouse|acid|tech.?house|deep house|dub techno|electro|perlon|cadenza)\b/i;

const REJECT_GENRE =
  /\b(alternative|folk|jazz|singer|songwriter|country|classical|gospel|hip.?hop|rap|metal|punk|indie rock|pop$|r&b|soul|blues|world|soundtrack|audiobook|children|kids|comedy)\b/i;

const REJECT_ARTIST_HINT =
  /\b(mari kvien|brunvoll|disney|mickey|topolino)\b/i;

/** True se sembra disco da club / digger vinyl. */
export function isClubDig(track: Track, seedHints: string[] = []): boolean {
  const genre = (track.genre || "").toLowerCase();
  const blob = `${track.artist} ${track.title} ${track.label} ${genre}`;
  const resolved = resolveGenre(track.genre);

  // Dance / Electro Pop e simili = fuori (a meno che stile club chiaro nel nome)
  if (/dance\s*\/\s*electro\s*pop|electro pop|dance pop/i.test(genre)) {
    if (!CLUB_GENRE_BLOB.test(blob)) return false;
  }

  if (REJECT_GENRE.test(genre) && !CLUB_STYLES.test(genre)) return false;
  if (resolved.slug === "dance-electro-pop" && !CLUB_GENRE_BLOB.test(blob)) {
    return false;
  }

  // Mari Kvien Brunvoll sola (senza Villalobos / remix credit) → fuori
  if (REJECT_ARTIST_HINT.test(track.artist)) {
    const withSeed =
      /villalobos|luciano|perlon|cadenza|reboot/i.test(blob) ||
      seedHints.some((h) => /villalobos/i.test(h));
    const isRemix = /mix|remix|edit|rework/i.test(track.title);
    if (!withSeed && !isRemix) return false;
    // Joanna / Sweet Mysterious = album vocal, non dig
    if (/joanna|sweet mysterious|everywhere you go$/i.test(track.title) && !isRemix) {
      return false;
    }
  }

  // Famiglia house/techno ok
  const fam = resolved.familySlug;
  if (fam === "house" || fam === "techno") return true;
  if (CLUB_STYLES.test(genre) || CLUB_GENRE_BLOB.test(genre)) return true;

  // Label da rete digger (Perlon, Dekmantel, Rawax…)
  if (
    /perlon|cadenza|ostgut|minus|cocoon|m-plant|fxhe|sushitech|alphahouse|sei es drum|playhouse|wagon repair|rawax|dekmantel|raum|frisbee|kompakt|plus.?8|purpose maker|mote[- ]evo|dialect|dial |holding|workshop|fabric|all\s*inn|castanea|nilla|memento/i.test(
      track.label,
    )
  ) {
    return true;
  }

  // Electronic / Dance generico: ok se artista seed o label non-vuota reale
  if (/electronic|^dance$/i.test(genre) || resolved.slug === "dance-electro-pop") {
    if (
      seedHints.some((h) => {
        const a = track.artist.toLowerCase();
        const h0 = h.toLowerCase();
        return (
          a.includes(h0) ||
          h0.includes(a.split(/\s+/)[0] || "") ||
          h0.split(/\s+/).some((p) => p.length > 3 && a.includes(p))
        );
      })
    ) {
      return true;
    }
    // label reale (non —) da Discogs rete
    if (track.label && track.label !== "—" && track.label.length >= 3) return true;
    return false;
  }

  return false;
}

export function clubStylesAllowed(styles: string[]): boolean {
  if (!styles.length) return false; // senza style Discogs → non fidarsi
  return styles.some((s) => CLUB_STYLES.test(s.trim()) || CLUB_GENRE_BLOB.test(s));
}

export function rejectNonClubStyles(styles: string[]): boolean {
  if (!styles.length) return true; // unknown = reject in scout
  const joined = styles.join(" ").toLowerCase();
  // Esplicitamente fuori club
  if (REJECT_GENRE.test(joined) && !clubStylesAllowed(styles)) return true;
  if (
    /folk|jazz|singer|songwriter|spoken|field recording|audiobook|children/i.test(
      joined,
    ) &&
    !clubStylesAllowed(styles)
  ) {
    return true;
  }
  // House/techno/minimal → ok
  if (clubStylesAllowed(styles)) return false;
  // Solo "Electronic" / "Dance" → ok (poi isClubDig raffina)
  if (styles.every((s) => /^(electronic|dance)$/i.test(s.trim()))) return false;
  return true;
}
