/**
 * Client Bandcamp JSON stile Diglist:
 * fancollection + tralbumcollectors.
 * Su molti host Cloudflare blocca: in quel caso ritorna ok:false.
 */

export type BcItem = {
  key: string;
  itemId: number;
  itemType: "a" | "t";
  title: string;
  artist: string;
  label?: string;
  url?: string;
  artworkUrl?: string;
  purchased?: boolean;
  addedAt?: number;
  numSold?: number;
};

export type BcFan = {
  fanId: number;
  username: string;
  followed: boolean;
};

export type BcProfile = {
  fanId: number;
  username: string;
  collection: BcItem[];
  wishlist: BcItem[];
  followingFans: string[];
  followingArtists: string[];
  followingLabels: string[];
};

const UA =
  "Mozilla/5.0 (compatible; OvunqueDiglist/1.0; +https://ovunque.apps.grok.bot)";

function olderToken(): string {
  return `${Math.floor(Date.now() / 1000)}::a::`;
}

async function bcPost<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(`https://bandcamp.com/api/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": UA,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok || text.includes("Client Challenge") || text.startsWith("<!")) {
      return null;
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function bcGetHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    const text = await res.text();
    if (!res.ok || text.includes("Client Challenge")) return null;
    return text;
  } catch {
    return null;
  }
}

function parseDataBlob(html: string): Record<string, unknown> | null {
  const m = html.match(/id="pagedata"[^>]*data-blob="([^"]+)"/);
  if (!m) return null;
  try {
    const decoded = m[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapItem(raw: Record<string, unknown>): BcItem | null {
  const title = String(raw.album_title || raw.item_title || raw.title || "").trim();
  const artist = String(raw.band_name || raw.artist || "").trim();
  if (!title || !artist) return null;
  const itemId = Number(raw.item_id || raw.tralbum_id || 0);
  const itemType = String(raw.item_type || "a").startsWith("t") ? "t" : "a";
  const key = `${itemType}${itemId || `${artist}|${title}`.toLowerCase()}`;
  return {
    key,
    itemId: itemId || 0,
    itemType,
    title: title.slice(0, 160),
    artist: artist.slice(0, 120),
    label: raw.label ? String(raw.label) : undefined,
    url: raw.item_url ? String(raw.item_url) : undefined,
    artworkUrl: raw.item_art_url
      ? String(raw.item_art_url)
      : raw.thumb_url
        ? String(raw.thumb_url)
        : undefined,
    purchased: raw.purchased != null || raw.is_purchased === true,
    addedAt: raw.added_date
      ? Date.parse(String(raw.added_date))
      : raw.purchased
        ? Date.parse(String(raw.purchased))
        : undefined,
    numSold: typeof raw.num_sold === "number" ? raw.num_sold : undefined,
  };
}

/** Step 1–2: profilo Bandcamp pubblico. */
export async function loadBandcampProfile(
  username: string,
): Promise<{ ok: true; profile: BcProfile } | { ok: false; reason: string }> {
  const user = username.replace(/^@/, "").trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,40}$/.test(user)) {
    return { ok: false, reason: "username_invalid" };
  }

  const html = await bcGetHtml(`https://bandcamp.com/${user}`);
  if (!html) return { ok: false, reason: "bandcamp_blocked_or_missing" };

  const blob = parseDataBlob(html);
  if (!blob) return { ok: false, reason: "pagedata_missing" };

  const fanData = (blob.fan_data || {}) as Record<string, unknown>;
  const fanId = Number(fanData.fan_id || 0);
  if (!fanId) return { ok: false, reason: "fan_id_missing" };

  const collectionData = (blob.collection_data || {}) as Record<string, unknown>;
  const wishlistData = (blob.wishlist_data || {}) as Record<string, unknown>;
  const itemCache = (blob.item_cache || {}) as Record<string, unknown>;

  const collection: BcItem[] = [];
  const wishlist: BcItem[] = [];

  const cacheCol = itemCache.collection;
  if (cacheCol && typeof cacheCol === "object") {
    Object.values(cacheCol as Record<string, unknown>).forEach((v) => {
      const it = mapItem(v as Record<string, unknown>);
      if (it) collection.push({ ...it, purchased: true });
    });
  }
  const cacheWish = itemCache.wishlist;
  if (cacheWish && typeof cacheWish === "object") {
    Object.values(cacheWish as Record<string, unknown>).forEach((v) => {
      const it = mapItem(v as Record<string, unknown>);
      if (it) wishlist.push({ ...it, purchased: false });
    });
  }

  // paginate collection ≤1500
  let token = String(collectionData.last_token || olderToken());
  let more = Boolean(collectionData.item_count && collection.length < Number(collectionData.item_count));
  while (more && collection.length < 1500) {
    const batch = await bcPost<{
      items?: Record<string, unknown>[];
      more_available?: boolean;
      last_token?: string;
    }>("fancollection/1/collection_items", {
      fan_id: fanId,
      older_than_token: token,
      count: 100,
    });
    if (!batch?.items?.length) break;
    for (const raw of batch.items) {
      const it = mapItem(raw);
      if (it) collection.push({ ...it, purchased: true });
    }
    more = !!batch.more_available && collection.length < 1500;
    token = batch.last_token || olderToken();
  }

  // wishlist ≤400
  token = String(wishlistData.last_token || olderToken());
  more = Boolean(wishlistData.item_count && wishlist.length < Number(wishlistData.item_count));
  while (more && wishlist.length < 400) {
    const batch = await bcPost<{
      items?: Record<string, unknown>[];
      more_available?: boolean;
      last_token?: string;
    }>("fancollection/1/wishlist_items", {
      fan_id: fanId,
      older_than_token: token,
      count: 100,
    });
    if (!batch?.items?.length) break;
    for (const raw of batch.items) {
      const it = mapItem(raw);
      if (it) wishlist.push({ ...it, purchased: false });
    }
    more = !!batch.more_available && wishlist.length < 400;
    token = batch.last_token || olderToken();
  }

  const followingFans: string[] = [];
  const followingArtists: string[] = [];
  const followingLabels: string[] = [];
  const following = blob.following_bands_data || blob.following_data;
  // best-effort from blob
  if (following && typeof following === "object") {
    const fd = following as Record<string, unknown>;
    if (Array.isArray(fd.followeers)) {
      /* ignore typo */
    }
  }

  return {
    ok: true,
    profile: {
      fanId,
      username: user,
      collection: collection.slice(0, 1500),
      wishlist: wishlist.slice(0, 400),
      followingFans,
      followingArtists,
      followingLabels,
    },
  };
}

/** Step 4: supporters di un tralbum (pagine). */
export async function loadSupporters(
  itemId: number,
  itemType: "a" | "t",
  pages: number,
): Promise<BcFan[]> {
  if (!itemId) return [];
  const fans: BcFan[] = [];
  const seen = new Set<number>();
  let olderThanToken: string | null = null;

  for (let p = 0; p < pages; p++) {
    const body: Record<string, unknown> = {
      tralbum_type: itemType,
      tralbum_id: itemId,
      count: 40,
    };
    if (olderThanToken) body.token = olderThanToken;

    const data = await bcPost<{
      results?: { fan_id?: number; username?: string }[];
      more_available?: boolean;
      last_token?: string;
    }>("tralbumcollectors/2/thumbs", body);

    if (!data?.results?.length) break;
    for (const r of data.results) {
      const id = Number(r.fan_id || 0);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      fans.push({
        fanId: id,
        username: String(r.username || `fan${id}`),
        followed: false,
      });
    }
    if (!data.more_available) break;
    olderThanToken = data.last_token || null;
  }
  return fans;
}

/** Collezione+wishlist di un fan (step 6). */
export async function loadFanLibrary(
  fanId: number,
  limit: number,
): Promise<BcItem[]> {
  const out: BcItem[] = [];
  let token = olderToken();
  let more = true;
  while (more && out.length < limit) {
    const batch = await bcPost<{
      items?: Record<string, unknown>[];
      more_available?: boolean;
      last_token?: string;
    }>("fancollection/1/collection_items", {
      fan_id: fanId,
      older_than_token: token,
      count: Math.min(100, limit - out.length),
    });
    if (!batch?.items?.length) break;
    for (const raw of batch.items) {
      const it = mapItem(raw);
      if (it) out.push({ ...it, purchased: true });
    }
    more = !!batch.more_available;
    token = batch.last_token || olderToken();
  }
  // wishlist slice
  if (out.length < limit) {
    token = olderToken();
    const batch = await bcPost<{ items?: Record<string, unknown>[] }>(
      "fancollection/1/wishlist_items",
      {
        fan_id: fanId,
        older_than_token: token,
        count: Math.min(80, limit - out.length),
      },
    );
    for (const raw of batch?.items ?? []) {
      const it = mapItem(raw);
      if (it) out.push({ ...it, purchased: false });
    }
  }
  return out.slice(0, limit);
}
