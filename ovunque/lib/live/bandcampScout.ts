/**
 * Scout Bandcamp Diglist-style:
 * traccia BC → supporters (chi l'ha comprata) → collezione di ogni fan → croce.
 *
 * Nota: bandcamp.com è dietro Cloudflare; da molti IP server risponde 403.
 * Se lo scrape fallisce, Diglist usa Discogs label/artist. Il path resta pronto
 * per quando BC risponde (o proxy collega).
 */

import type { Track } from "../types";
import { resolveGenre } from "../genres";
import { safeHttpsUrl } from "../sanitizeTrack";

export type BcFanHit = {
  track: Track;
  buyers: number;
  seedLinks: number;
  score: number;
};

function bandcampUrlFromSeed(seed: Track): string | null {
  const offer = seed.offers?.find((o) => o.storeId === "bandcamp");
  const u = offer?.url ? safeHttpsUrl(offer.url) : undefined;
  if (u && /bandcamp\.com\//i.test(u) && !/\/search\?/i.test(u)) return u;
  return null;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OvunqueDiglist/1.0; +https://ovunque.apps.grok.bot)",
        Accept: "text/html,application/json",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes("Client Challenge") || text.includes("_fs-ch-")) return null;
    return text;
  } catch {
    return null;
  }
}

/** Estrae fan username da HTML supporters / data-blob. */
function extractFanIds(html: string): string[] {
  const fans = new Set<string>();
  const reFan = /bandcamp\.com\/([a-zA-Z0-9_-]{2,40})/g;
  let m: RegExpExecArray | null;
  while ((m = reFan.exec(html))) {
    const u = m[1].toLowerCase();
    if (
      [
        "api",
        "search",
        "tag",
        "login",
        "signup",
        "help",
        "discover",
        "video",
        "download",
      ].includes(u)
    ) {
      continue;
    }
    fans.add(u);
    if (fans.size >= 24) break;
  }
  // data-fan attributes
  const reData = /data-fan=["']([^"']+)["']/gi;
  while ((m = reData.exec(html))) {
    fans.add(m[1].toLowerCase());
    if (fans.size >= 30) break;
  }
  return Array.from(fans).slice(0, 20);
}

type ColItem = { artist: string; title: string; itemUrl?: string };

function extractCollectionItems(html: string): ColItem[] {
  const items: ColItem[] = [];
  // collection items often in data-blob JSON
  const blobMatch = html.match(/data-blob="([^"]+)"/);
  if (blobMatch) {
    try {
      const decoded = blobMatch[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'");
      const json = JSON.parse(decoded) as {
        item_data?: Record<
          string,
          { artist?: string; title?: string; item_url?: string }
        >;
      };
      if (json.item_data) {
        Object.values(json.item_data).forEach((it) => {
          if (it.artist && it.title) {
            items.push({
              artist: it.artist,
              title: it.title,
              itemUrl: it.item_url,
            });
          }
        });
      }
    } catch {
      /* ignore */
    }
  }
  // fallback: album/track links with titles
  const re = /<a[^>]+href="(https:\/\/[a-z0-9-]+\.bandcamp\.com\/(?:album|track)\/[^"]+)"[^>]*>[\s\S]*?<p class="title">([^<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    items.push({ artist: "—", title: m[2].trim(), itemUrl: m[1] });
    if (items.length >= 40) break;
  }
  return items.slice(0, 40);
}

function itemToTrack(it: ColItem, genreHint: string): Track {
  const raw = `${it.artist}|${it.title}`;
  let enc = "";
  for (let i = 0; i < raw.length; i++) enc += raw.charCodeAt(i).toString(16);
  const id = `bc-${enc.slice(0, 18)}`;
  const q = encodeURIComponent(`${it.artist} ${it.title}`);
  return {
    id,
    title: it.title.slice(0, 120),
    artist: (it.artist === "—" ? "Bandcamp" : it.artist).slice(0, 120),
    label: "Bandcamp",
    genre: resolveGenre(genreHint).name,
    year: new Date().getFullYear(),
    mood: "club",
    coverHue: (id.charCodeAt(3) * 13) % 360,
    suggested: true,
    rails: ["per-te"],
    offers: [
      {
        storeId: "bandcamp",
        kind: "paid",
        priceEur: null,
        priceFrom: true,
        currency: "EUR",
        format: "FLAC / MP3",
        url: it.itemUrl || `https://bandcamp.com/search?q=${q}`,
        media: "digital",
      },
    ],
    source: "live",
  };
}

/**
 * Per ogni seed con URL Bandcamp: fans → collezioni → croce.
 * Ritorna [] se Cloudflare blocca (caso tipico server-side).
 */
export async function scoutBandcampBuyers(
  seeds: Track[],
  limit = 24,
): Promise<{ tracks: Track[]; note: string; ok: boolean }> {
  const picked = seeds.slice(0, 6);
  const urls = picked.map(bandcampUrlFromSeed);
  if (!urls.some(Boolean)) {
    return {
      tracks: [],
      ok: false,
      note: "Nessun URL Bandcamp diretto sui pick — uso Discogs/ragnatela",
    };
  }

  // itemKey → { seedLinks, fans }
  const acc = new Map<
    string,
    { item: ColItem; seedLinks: Set<number>; fans: Set<string> }
  >();
  let anyOk = false;

  for (let i = 0; i < picked.length; i++) {
    const url = urls[i];
    if (!url) continue;
    const page = await fetchText(url);
    if (!page) continue;
    anyOk = true;
    const fans = extractFanIds(page);
    // anche pagina /supporters se linkata
    const supportUrl = url.replace(/\/$/, "") + "/#supporters";
    void supportUrl;

    for (const fan of fans.slice(0, 12)) {
      const colHtml = await fetchText(`https://bandcamp.com/${fan}`);
      if (!colHtml) continue;
      const items = extractCollectionItems(colHtml);
      for (const it of items) {
        const key = `${it.artist.toLowerCase()}|${it.title.toLowerCase()}`;
        // skip seed itself
        const seedKey = `${picked[i].artist}|${picked[i].title}`.toLowerCase();
        if (key === seedKey) continue;
        let row = acc.get(key);
        if (!row) {
          row = { item: it, seedLinks: new Set(), fans: new Set() };
          acc.set(key, row);
        }
        row.seedLinks.add(i);
        row.fans.add(fan);
      }
    }
  }

  if (!anyOk) {
    return {
      tracks: [],
      ok: false,
      note: "Bandcamp Cloudflare — scout buyers non disponibile da questo host",
    };
  }

  const genreHint = picked[0]?.genre ?? "Electronic";
  const ranked = Array.from(acc.values())
    .map((row) => ({
      track: itemToTrack(row.item, genreHint),
      buyers: row.fans.size,
      seedLinks: row.seedLinks.size,
      score: row.fans.size * 10 + row.seedLinks.size * 80,
    }))
    .filter((h) => h.score >= 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    tracks: ranked.map((r) => r.track),
    ok: true,
    note: `Bandcamp buyers×collezioni · ${ranked.length} dig`,
  };
}
