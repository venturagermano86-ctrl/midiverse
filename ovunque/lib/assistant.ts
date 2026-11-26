export type AssistantAction =
  | { type: "navigate"; href: string }
  | { type: "none" };

export type AssistantReply = {
  /** Frase da dire a voce (italiana, corta). */
  text: string;
  action: AssistantAction;
};

/** Comandi vocali Dig List → risposta parlata + eventuale navigazione. */
export function replyToUtterance(raw: string): AssistantReply {
  const q = raw.trim().replace(/\s+/g, " ");
  if (!q) {
    return {
      text: "Dimmi un comando. Per esempio: cerca una traccia, apri i chart, oppure wishlist.",
      action: { type: "none" },
    };
  }

  const lower = q.toLowerCase();

  if (/^(ciao|ehi|hey|salve|buongiorno|buonasera)\b/.test(lower)) {
    return {
      text: "Ciao. Dimmi cosa vuoi: cerca, chart, generi o wishlist.",
      action: { type: "none" },
    };
  }

  if (/(aiuto|help|cosa puoi|che puoi|comandi)/.test(lower)) {
    return {
      text: "Puoi dirmi: cerca e il nome, apri deep house, vai ai chart, apri wishlist, o torna in home.",
      action: { type: "none" },
    };
  }

  if (/(wishlist|lista desideri|cuori|preferit)/.test(lower)) {
    return {
      text: "Apro la wishlist.",
      action: { type: "navigate", href: "/wishlist" },
    };
  }

  if (/(chart|classifica|top\b)/.test(lower)) {
    return {
      text: "Ti porto ai chart.",
      action: { type: "navigate", href: "/charts" },
    };
  }

  if (/(dig\s*list|diglist|consigli|picks)/.test(lower)) {
    return {
      text: "Apro Dig List.",
      action: { type: "navigate", href: "/diglist" },
    };
  }

  if (/(collezione|collection|miei dischi)/.test(lower)) {
    return {
      text: "Apro la tua collezione.",
      action: { type: "navigate", href: "/collezione" },
    };
  }

  if (/(account|profilo)/.test(lower)) {
    return {
      text: "Apro l'account.",
      action: { type: "navigate", href: "/account" },
    };
  }

  if (/(home|inizio|torna indietro|vai a casa|pagina principale)/.test(lower)) {
    return {
      text: "Torniamo in home.",
      action: { type: "navigate", href: "/" },
    };
  }

  const genreHit = matchGenre(lower);
  if (genreHit) {
    return {
      text: `Apro ${genreHit.name}.`,
      action: { type: "navigate", href: `/generi/${genreHit.slug}` },
    };
  }

  if (/(generi|genre|browse)/.test(lower)) {
    return {
      text: "Ti porto ai generi.",
      action: { type: "navigate", href: "/generi" },
    };
  }

  const search = extractSearch(q, lower);
  if (search) {
    return {
      text: `Cerco ${search}.`,
      action: {
        type: "navigate",
        href: `/cerca?q=${encodeURIComponent(search)}`,
      },
    };
  }

  return {
    text: `Cerco ${q}.`,
    action: {
      type: "navigate",
      href: `/cerca?q=${encodeURIComponent(q)}`,
    },
  };
}

const GENRE_ALIASES: { slug: string; name: string; keys: string[] }[] = [
  { slug: "deep-house", name: "Deep House", keys: ["deep house", "deep-house"] },
  { slug: "tech-house", name: "Tech House", keys: ["tech house", "tech-house"] },
  { slug: "afro-house", name: "Afro House", keys: ["afro house", "afro-house"] },
  { slug: "organic-house", name: "Organic House", keys: ["organic house", "organic-house"] },
  { slug: "progressive-house", name: "Progressive House", keys: ["progressive house"] },
  {
    slug: "minimal-deep-tech",
    name: "Minimal Deep Tech",
    keys: ["minimal", "microhouse", "deep tech"],
  },
  { slug: "melodic-techno", name: "Melodic Techno", keys: ["melodic techno"] },
  { slug: "techno", name: "Techno", keys: ["techno"] },
  { slug: "house", name: "House", keys: ["house"] },
  { slug: "nu-disco", name: "Nu Disco", keys: ["nu disco", "nudisco", "disco"] },
  { slug: "breaks", name: "Breaks", keys: ["breaks", "breakbeat"] },
  { slug: "uk-garage", name: "UK Garage", keys: ["uk garage", "garage"] },
];

function matchGenre(lower: string) {
  for (const g of GENRE_ALIASES) {
    if (g.keys.some((k) => lower.includes(k))) return g;
  }
  return null;
}

function extractSearch(original: string, lower: string): string | null {
  const patterns = [
    /(?:cerca|trova|voglio|fammi|apri|search|find)\s+(?:la\s+traccia\s+|il\s+pezzo\s+|track\s+)?(.+)/i,
    /(?:ascolta|play)\s+(.+)/i,
  ];
  for (const re of patterns) {
    const m = original.match(re);
    if (m?.[1]) {
      const cleaned = m[1].replace(/^(per\s+|di\s+|una\s+|un\s+)/i, "").trim();
      // Se "apri deep house" è già un genere, non trattarlo come search qui
      if (cleaned.length >= 2 && !matchGenre(cleaned.toLowerCase())) return cleaned;
      if (cleaned.length >= 2 && /^(cerca|trova|search|find)/i.test(original)) return cleaned;
    }
  }
  if (lower.split(" ").length <= 6 && !/^(ciao|hey|ok|grazie)/.test(lower)) {
    return original.trim();
  }
  return null;
}
