/** Safe YouTube / SoundCloud reference fetch — oEmbed only, fixed hosts (no SSRF). */

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "soundcloud.com",
  "www.soundcloud.com",
  "on.soundcloud.com",
]);

export function normalizeMediaUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (!ALLOWED_HOSTS.has(host)) return null;
    // Strip tracking junk; keep path/query needed for the video id
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export function isAllowedMediaUrl(raw: string): boolean {
  return normalizeMediaUrl(raw) !== null;
}

export type OEmbedMeta = {
  title: string;
  author: string;
  thumbnail: string;
  provider: string;
};

export async function fetchOEmbed(url: string): Promise<OEmbedMeta | null> {
  const normalized = normalizeMediaUrl(url);
  if (!normalized) return null;

  const host = new URL(normalized).hostname.toLowerCase().replace(/^www\./, "");
  const endpoints: string[] = [];
  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    endpoints.push(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(normalized)}`
    );
  }
  if (host.endsWith("soundcloud.com")) {
    endpoints.push(
      `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(normalized)}`
    );
  }

  for (const ep of endpoints) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(ep, {
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(t);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
        provider_name?: string;
      };
      if (!data.title) continue;
      return {
        title: data.title || "",
        author: data.author_name || "",
        thumbnail: data.thumbnail_url || "",
        provider: data.provider_name || "",
      };
    } catch {
      /* try next */
    }
  }
  return null;
}
