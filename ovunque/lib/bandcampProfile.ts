const KEY = "dig.bandcamp.username";

export function getBandcampUsername(): string {
  if (typeof window === "undefined") return "";
  try {
    return (localStorage.getItem(KEY) || "").trim();
  } catch {
    return "";
  }
}

export function setBandcampUsername(username: string): void {
  if (typeof window === "undefined") return;
  const v = username.replace(/^@/, "").trim().toLowerCase().slice(0, 40);
  try {
    if (v) localStorage.setItem(KEY, v);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
