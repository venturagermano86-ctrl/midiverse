import type { ScanHit, ScanReport, Track } from "../types";
import { rankOffers } from "../engines/price";
import { ADAPTERS } from "./adapters";
import { STORE_ORDER } from "../stores";

function jitter(seed: string, storeId: string): number {
  let h = 0;
  const s = seed + storeId;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 40 + (h % 180);
}

/**
 * Motore mostruoso (demo): interroga in parallelo tutti i portali registrati,
 * aggrega free + paid, ranka col prezzo (gratis sempre in cima).
 */
export function scanTrack(track: Track): ScanReport {
  const hits: ScanHit[] = ADAPTERS.map((adapter) => {
    const latencyMs = jitter(track.id, adapter.storeId);
    try {
      const offer = adapter.lookup(track);
      if (!offer) {
        return {
          storeId: adapter.storeId,
          status: "missing" as const,
          latencyMs,
          note: "Non trovata su questo portale",
        };
      }
      return {
        storeId: adapter.storeId,
        status: "found" as const,
        offer,
        latencyMs,
        note:
          offer.kind === "free"
            ? "Download gratuito disponibile"
            : `Listino ${offer.priceEur.toFixed(2)} €`,
      };
    } catch {
      return {
        storeId: adapter.storeId,
        status: "error" as const,
        latencyMs,
        note: "Portale non raggiungibile",
      };
    }
  });

  // Ordina i hit come nel registro portali
  hits.sort(
    (a, b) => STORE_ORDER.indexOf(a.storeId) - STORE_ORDER.indexOf(b.storeId),
  );

  const ranked = rankOffers(
    hits.filter((h) => h.offer).map((h) => h.offer!),
  );

  return {
    trackId: track.id,
    scannedAt: new Date().toISOString(),
    hits,
    ranked,
    best: ranked[0] ?? null,
    portalsChecked: ADAPTERS.length,
    freeFound: ranked.some((o) => o.kind === "free" || o.priceEur === 0),
  };
}
