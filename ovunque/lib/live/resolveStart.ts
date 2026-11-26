/**
 * Parte Diglist da qualunque indizio:
 * artista, label, titolo, link YouTube / Bandcamp / Discogs / Beatport / SoundCloud.
 */

export type StartKind =
  | "text"
  | "artist"
  | "label"
  | "youtube"
  | "bandcamp"
  | "discogs"
  | "beatport"
  | "soundcloud"
  | "url";

export type StartResolved = {
  kind: StartKind;
  queries: string[];
  note: string;
  artistHint?: string;
  titleHint?: string;
  labelHint?: string;
};

const URL_RE = /https?:\/\/[^\s<>"']+/i;

function firstUrl(raw: string): string | null {
  const m = raw.match(URL_RE);
  return m ? m[0].replace(/[.,;)]+$/, "") : null;
}

function cleanTitleNoise(s: string): string {
  return s
    .replace(/\([^)]*(official|video|audio|lyric|hd|4k|visualizer)[^)]*\)/gi, " ")
    .replace(/\[[^\]]*(official|video|audio|lyric|hd)[^\]]*\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Artist - Title" / "Artist – Title" */
export function splitArtistTitle(raw: string): { artist?: string; title?: string } {
  const s = cleanTitleNoise(raw);
  const parts = s.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  }
  return { title: s };
}

async function youtubeOembed(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    if (data.title) {
      const split = splitArtistTitle(data.title);
      if (split.artist && split.title) return `${split.artist} ${split.title}`;
      if (data.author_name && split.title)
        return `${data.author_name} ${split.title}`;
      return data.title;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function soundcloudOembed(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    if (data.title && data.author_name) return `${data.author_name} ${data.title}`;
    return data.title || null;
  } catch {
    return null;
  }
}

function parseBandcamp(url: string): StartResolved | null {
  try {
    const u = new URL(url);
    if (!/bandcamp\.com$/i.test(u.hostname) && !u.hostname.endsWith(".bandcamp.com"))
      return null;
    const parts = u.pathname.split("/").filter(Boolean);
    // artist.bandcamp.com/track/slug or /album/slug
    const hostArtist = u.hostname.replace(/\.bandcamp\.com$/i, "");
    if (parts[0] === "track" || parts[0] === "album") {
      const slug = (parts[1] || "").replace(/-/g, " ");
      const artist = hostArtist.includes(".") ? "" : hostArtist.replace(/-/g, " ");
      const q = [artist, slug].filter(Boolean).join(" ");
      return {
        kind: "bandcamp",
        queries: q ? [q] : [slug],
        note: "Da link Bandcamp",
        artistHint: artist || undefined,
        titleHint: slug || undefined,
      };
    }
    if (hostArtist && !hostArtist.includes(".")) {
      return {
        kind: "bandcamp",
        queries: [hostArtist.replace(/-/g, " ")],
        note: "Artista Bandcamp",
        artistHint: hostArtist.replace(/-/g, " "),
      };
    }
  } catch {
    return null;
  }
  return null;
}

function parseDiscogs(url: string): StartResolved | null {
  try {
    const u = new URL(url);
    if (!/discogs\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    // /release/123-Artist-Title or /artist/123-Name or /label/123-Name
    if (parts[0] === "release" || parts[0] === "master") {
      const slug = (parts[1] || "").replace(/^\d+-?/, "").replace(/-/g, " ");
      return {
        kind: "discogs",
        queries: slug ? [slug] : ["electronic"],
        note: "Da link Discogs release",
        titleHint: slug || undefined,
      };
    }
    if (parts[0] === "artist") {
      const name = (parts[1] || "").replace(/^\d+-?/, "").replace(/-/g, " ");
      return {
        kind: "discogs",
        queries: name ? [name] : [],
        note: "Da link Discogs artist",
        artistHint: name || undefined,
      };
    }
    if (parts[0] === "label") {
      const name = (parts[1] || "").replace(/^\d+-?/, "").replace(/-/g, " ");
      return {
        kind: "discogs",
        queries: name ? [name] : [],
        note: "Da link Discogs label",
        labelHint: name || undefined,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function parseBeatport(url: string): StartResolved | null {
  try {
    const u = new URL(url);
    if (!/beatport\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    // /track/slug/id or /artist/slug/id or /label/slug/id
    if (parts[0] === "track" || parts[0] === "release") {
      const slug = (parts[1] || "").replace(/-/g, " ");
      return {
        kind: "beatport",
        queries: slug ? [slug] : [],
        note: "Da link Beatport",
        titleHint: slug || undefined,
      };
    }
    if (parts[0] === "artist" || parts[0] === "label") {
      const slug = (parts[1] || "").replace(/-/g, " ");
      return {
        kind: "beatport",
        queries: slug ? [slug] : [],
        note: `Da Beatport ${parts[0]}`,
        artistHint: parts[0] === "artist" ? slug : undefined,
        labelHint: parts[0] === "label" ? slug : undefined,
      };
    }
  } catch {
    return null;
  }
  return null;
}

/** Risolve testo o URL → query di ricerca Diglist. */
export async function resolveStartInput(
  raw: string,
  mode: "auto" | "artist" | "label" = "auto",
): Promise<StartResolved> {
  const text = raw.trim().slice(0, 500);
  if (!text) {
    return { kind: "text", queries: [], note: "Vuoto" };
  }

  const url = firstUrl(text);

  if (url) {
    if (/youtu\.be\/|youtube\.com\//i.test(url)) {
      const q = await youtubeOembed(url);
      const split = q ? splitArtistTitle(q) : {};
      return {
        kind: "youtube",
        queries: q ? [q] : [text.replace(url, "").trim()].filter(Boolean),
        note: "Da YouTube",
        artistHint: split.artist,
        titleHint: split.title,
      };
    }
    if (/soundcloud\.com\//i.test(url)) {
      const q = await soundcloudOembed(url);
      return {
        kind: "soundcloud",
        queries: q ? [q] : [],
        note: "Da SoundCloud",
      };
    }
    const bc = parseBandcamp(url);
    if (bc) return bc;
    const dg = parseDiscogs(url);
    if (dg) return dg;
    const bp = parseBeatport(url);
    if (bp) return bp;
    return {
      kind: "url",
      queries: [text.replace(url, "").trim() || url],
      note: "Link generico — cerco dal testo",
    };
  }

  if (mode === "label" || /^label:\s*/i.test(text)) {
    const label = text.replace(/^label:\s*/i, "").trim();
    return {
      kind: "label",
      queries: [label],
      note: "Ricerca label",
      labelHint: label,
    };
  }

  if (mode === "artist" || /^artist:\s*/i.test(text)) {
    const artist = text.replace(/^artist:\s*/i, "").trim();
    return {
      kind: "artist",
      queries: [artist],
      note: "Ricerca artista",
      artistHint: artist,
    };
  }

  const split = splitArtistTitle(text);
  return {
    kind: "text",
    queries: [text],
    note: "Testo libero (artista / titolo / label)",
    artistHint: split.artist,
    titleHint: split.title,
  };
}
