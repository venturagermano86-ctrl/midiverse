/**
 * Filtro club underground — tiene dig tipo Gtronic / Villalobos / Perlon / All Inn,
 * taglia reggae, jazz, folk, electro-pop, alternative…
 */

import type { Track } from "../types";
import { resolveGenre } from "../genres";

const CLUB_STYLES =
  /^(house|deep house|tech house|techno|minimal|microhouse|acid|dub techno|electro|hard techno|melodic techno|tribal house|progressive house|jackin|garage|uk garage|broken beat|organic house|afro house)$/i;

const CLUB_GENRE_BLOB =
  /\b(house|techno|minimal|microhouse|acid|tech.?house|deep house|dub techno|electro|perlon|cadenza|all\s*inn)\b/i;

/** Fuori lane — anche se arriva da rete Discogs. */
const REJECT_HARD =
  /\b(reggae|dancehall|ska|ragga|roots reggae|rocksteady|dubstep|uk drill|grime|trap|country|classical|gospel|hip.?hop|rap|metal|punk|indie rock|folk|jazz|singer|songwriter|blues|world|soundtrack|audiobook|children|kids|comedy|salsa|cumbia|bachata|reggaeton|afrobeats(?!\s*house)|latin pop|k-?pop|bollywood)\b/i;

const REJECT_GENRE =
  /\b(alternative|folk|jazz|singer|songwriter|country|classical|gospel|hip.?hop|rap|metal|punk|indie rock|pop$|r&b|soul|blues|world|soundtrack|audiobook|children|kids|comedy|reggae|dancehall|ska|ragga)\b/i;

const REJECT_ARTIST_HINT =
  /\b(mari kvien|brunvoll|disney|mickey|topolino)\b/i;

const TRUSTED_LABEL =
  /perlon|cadenza|ostgut|minus|cocoon|m-plant|fxhe|sushitech|alphahouse|sei es drum|playhouse|wagon repair|rawax|dekmantel|raum|frisbee|kompakt|plus.?8|purpose maker|mote[- ]evo|dialect|dial |holding|workshop|fabric|all\s*inn|castanea|nilla|memento|workshop|ilian tape|token|drumcode|counterpoint|hotflush|hessle|clone|bedroom|rec|nang|apostle|rukkus|semantica|polegroup/i;

/** Hard reject: reggae e fuori-club assoluti (anche su label rete). */
export function isHardOffLane(track: Track): boolean {
  const blob = `${track.artist} ${track.title} ${track.label} ${track.genre || ""}`;
  if (REJECT_HARD.test(blob)) return true;
  // "Dub" da solo senza "techno/house" → spesso reggae dub
  if (/\bdub\b/i.test(track.genre || "") && !/\b(techno|house|minimal|electro)\b/i.test(blob)) {
    return true;
  }
  if (/mickey|topolino|disney|clubhouse/i.test(blob)) return true;
  return false;
}

/** True se sembra disco da club / digger vinyl. */
export function isClubDig(track: Track, seedHints: string[] = []): boolean {
  if (isHardOffLane(track)) return false;

  const genre = (track.genre || "").toLowerCase();
  const blob = `${track.artist} ${track.title} ${track.label} ${genre}`;
  const resolved = resolveGenre(track.genre);

  // Dance / Electro Pop e simili = fuori (a meno che stile club chiaro)
  if (/dance\s*\/\s*electro\s*pop|electro pop|dance pop/i.test(genre)) {
    if (!CLUB_GENRE_BLOB.test(blob)) return false;
  }

  if (REJECT_GENRE.test(genre) && !CLUB_STYLES.test(genre)) return false;
  if (resolved.slug === "dance-electro-pop" && !CLUB_GENRE_BLOB.test(blob)) {
    return false;
  }

  // Mari Kvien Brunvoll sola → fuori
  if (REJECT_ARTIST_HINT.test(track.artist)) {
    const withSeed =
      /villalobos|luciano|perlon|cadenza|reboot/i.test(blob) ||
      seedHints.some((h) => /villalobos/i.test(h));
    const isRemix = /mix|remix|edit|rework/i.test(track.title);
    if (!withSeed && !isRemix) return false;
    if (/joanna|sweet mysterious|everywhere you go$/i.test(track.title) && !isRemix) {
      return false;
    }
  }

  // Famiglia house/techno ok
  const fam = resolved.familySlug;
  if (fam === "house" || fam === "techno") return true;
  if (CLUB_STYLES.test(genre) || CLUB_GENRE_BLOB.test(genre)) return true;

  // Label da rete digger
  if (TRUSTED_LABEL.test(track.label || "")) {
    // Anche su label fidata: niente reggae/jazz
    return !REJECT_GENRE.test(genre);
  }

  // Electronic / Dance generico: solo se artista seed (non qualsiasi label)
  if (/electronic|^dance$/i.test(genre) || resolved.slug === "dance-electro-pop") {
    if (
      seedHints.some((h) => {
        const a = track.artist.toLowerCase();
        const h0 = h.toLowerCase();
        return (
          a === h0 ||
          a.includes(h0) ||
          h0.includes(a.split(/\s+/)[0] || "") ||
          h0.split(/\s+/).some((p) => p.length > 3 && a.includes(p))
        );
      })
    ) {
      return true;
    }
    return false;
  }

  return false;
}

export function clubStylesAllowed(styles: string[]): boolean {
  if (!styles.length) return false;
  return styles.some((s) => CLUB_STYLES.test(s.trim()) || CLUB_GENRE_BLOB.test(s));
}

export function rejectNonClubStyles(styles: string[]): boolean {
  if (!styles.length) return true;
  const joined = styles.join(" ").toLowerCase();
  if (REJECT_HARD.test(joined)) return true;
  if (REJECT_GENRE.test(joined) && !clubStylesAllowed(styles)) return true;
  if (
    /folk|jazz|singer|songwriter|spoken|field recording|audiobook|children|reggae|dancehall|ska/i.test(
      joined,
    ) &&
    !clubStylesAllowed(styles)
  ) {
    return true;
  }
  if (clubStylesAllowed(styles)) return false;
  if (styles.every((s) => /^(electronic|dance)$/i.test(s.trim()))) return false;
  return true;
}
