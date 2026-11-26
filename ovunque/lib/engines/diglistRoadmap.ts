/**
 * DIGLIST — piano a due fasi (registrato, non saltare)
 *
 * ─────────────────────────────────────────────────────────────
 * FASE 1 — ORA (poca utenza)
 * ─────────────────────────────────────────────────────────────
 * Metodo “social da etichetta” su Discogs (e fallback curato):
 *
 *   pick selezionato
 *     → dove è uscito (label: All Inn, Perlon, …)
 *     → tutti gli artisti usciti su quella label
 *     → dove ALTRO hanno stampato (altre label)
 *     → roster di quelle label
 *     → continua gli hop finché Short/Long sono piene
 *
 * Bandcamp ORA (autostrada opzionale, non sostitutiva):
 *   - username Bandcamp in Account → collezione/wishlist pubblica
 *   - serve a marcare “già posseduto” e a seedare se manca il pick
 *   - NON è ancora la croce tra utenti (troppa poca gente)
 *
 * ─────────────────────────────────────────────────────────────
 * FASE 2 — DOPO (account + bella utenza)
 * ─────────────────────────────────────────────────────────────
 * Ogni persona ha account → wishlist + collezione sue.
 *
 * Croce utenti (esempio che hai detto):
 *   Tu hai 4 tracce in comune con un’altra persona
 *     → probabilmente ti piacciono anche le ALTRE sue
 *     → te le consiglio (peso alto se croce×N ≥ 2–4)
 *
 * Fonti croce Fase 2 (stessa logica, tre autostrade):
 *   1) Wishlist Ovunque (owner_sub) — già: coWishlistedWithSeeds /
 *      buyerCollectionsForSeeds in lib/wishlist.ts
 *   2) Collezioni Ovunque (quando ci saranno)
 *   3) Bandcamp (profilo collegato) — fan library tra utenti che
 *      condividono gli stessi acquisti/wishlist BC
 *
 * Ordine quando Fase 2 è attiva:
 *   A) croce utenti (wishlist/collezioni/BC)  ← priorità
 *   B) rete label Discogs                     ← riempie i buchi
 *
 * Soglia tipica croce: ≥2 seed in comune = segnale; ≥4 = autostrada forte.
 *
 * NON fare dump di genere. NON Topolino. Solo pezzi correlati ai pick.
 */

export type DigPhase = 1 | 2;

/** Finché non c’è massa critica di account/wishlist, restiamo in Fase 1. */
export const DIGLIST_PHASE: DigPhase = 1;

/** Quanti seed in comune bastano per considerare “stessa autostrada” utente. */
export const USER_CROCE_MIN_SHARED = 2;

/** Quanti in comune = segnale forte (il tuo esempio: ~4 tracce). */
export const USER_CROCE_STRONG_SHARED = 4;

/**
 * Quando passare a Fase 2 (hint operativo, non gate automatico ancora):
 * - account reali con wishlist
 * - abbastanza owner_sub distinti che condividono seed
 */
export const FASE2_HINT = {
  minDistinctOwnersSharingSeeds: 8,
  preferUserCroceWhenShared: USER_CROCE_STRONG_SHARED,
  bandcamp: "profilo collegato = terza autostrada sulla stessa croce",
} as const;

export function diglistPhaseNote(phase: DigPhase = DIGLIST_PHASE): string {
  if (phase === 2) {
    return "Fase 2 · croce utenti (wishlist/collezioni/Bandcamp) + rete label";
  }
  return "Fase 1 · rete label Discogs (All Inn→Perlon…) · croce utenti dopo";
}
