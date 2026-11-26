"use client";

import { useMemo, useState, type SyntheticEvent } from "react";
import { GENRES } from "@/lib/genres";
import { BPM_PRESETS, KEYS } from "@/lib/keys";
import { SINGERS } from "@/lib/singers";

/** Only one stem player at a time — pause/reset the others. */
function exclusivePlay(e: SyntheticEvent<HTMLAudioElement>) {
  const current = e.currentTarget;
  document.querySelectorAll("audio").forEach((el) => {
    if (el !== current) {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  });
}

const LENGTHS = [
  { sec: 16, label: "16s" },
  { sec: 24, label: "24s" },
  { sec: 32, label: "32s" },
  { sec: 48, label: "48s" },
];

type Analysis = {
  bpm?: number;
  key?: string;
  label?: string;
  bank?: string;
  packId?: string;
  voice?: string;
  wetVoice?: string;
  dry?: string[];
  wet?: string[];
  refDry?: string[];
  refWet?: string[];
  dryVoice?: string;
  notes?: number[];
  note?: string;
  engine?: string;
  sourceTitle?: string;
  sourceAuthor?: string;
  sourceMode?: string;
  lengthSec?: number;
  system?: string;
};

function b64ToUrl(b64: string, mime: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export default function VocalStudioPage() {
  const [genreId, setGenreId] = useState(GENRES[0].id);
  const genre = useMemo(
    () => GENRES.find((g) => g.id === genreId) || GENRES[0],
    [genreId]
  );
  const [variationId, setVariationId] = useState(GENRES[0].variations[0].id);
  const variation =
    genre.variations.find((v) => v.id === variationId) || genre.variations[0];

  const [mode, setMode] = useState<
    "remake" | "generate" | "overlay" | "reference"
  >("remake");
  const [lengthSec, setLengthSec] = useState(32);
  const [bpm, setBpm] = useState(124);
  const [keyId, setKeyId] = useState("Am");
  const [singerId, setSingerId] = useState(SINGERS[0].id);
  const [track, setTrack] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mixUrl, setMixUrl] = useState<string | null>(null);
  const [dryUrl, setDryUrl] = useState<string | null>(null);
  const [wetUrl, setWetUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  function revokeAll() {
    if (mixUrl) URL.revokeObjectURL(mixUrl);
    if (dryUrl) URL.revokeObjectURL(dryUrl);
    if (wetUrl) URL.revokeObjectURL(wetUrl);
    setMixUrl(null);
    setDryUrl(null);
    setWetUrl(null);
  }

  function onGenreChange(id: string) {
    setGenreId(id);
    const g = GENRES.find((x) => x.id === id)!;
    setVariationId(g.variations[0].id);
    const mid = Math.round((g.bpmHint[0] + g.bpmHint[1]) / 2);
    setBpm(mid);
  }

  async function onGenerate() {
    setBusy(true);
    setError(null);
    setAnalysis(null);
    revokeAll();
    try {
      const url = sourceUrl.trim();
      if (mode === "reference" && !track && !url) {
        throw new Error("Incolla un link YouTube, oppure carica la traccia.");
      }
      if (mode === "overlay" && !track && !url) {
        throw new Error("Carica la tua traccia (o un link).");
      }
      // remake: link optional — works from BPM/key/cantante alone
      const body = new FormData();
      body.set("genreId", genre.id);
      body.set("variationId", variation.id);
      body.set("lengthSec", String(lengthSec));
      body.set("mode", mode);
      body.set("bpm", String(bpm));
      body.set("key", keyId);
      body.set("singerId", singerId);
      body.set("stems", "1");
      body.set("format", "json");
      if (track) body.set("track", track);
      if (url) body.set("sourceUrl", url);

      const res = await fetch("/api/generate", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Errore ${res.status}`);
      }
      const data = (await res.json()) as {
        analysis?: Analysis;
        stems?: { dry: string; wet: string; mix: string };
      };
      if (data.analysis) {
        setAnalysis(data.analysis);
        if (
          typeof data.analysis.bpm === "number" &&
          Number.isFinite(data.analysis.bpm)
        ) {
          setBpm(Math.round(data.analysis.bpm));
        }
        if (data.analysis.key) setKeyId(data.analysis.key);
      }
      if (data.stems) {
        setDryUrl(b64ToUrl(data.stems.dry, "audio/mpeg"));
        setWetUrl(b64ToUrl(data.stems.wet, "audio/mpeg"));
        setMixUrl(b64ToUrl(data.stems.mix, "audio/mpeg"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generazione fallita");
    } finally {
      setBusy(false);
    }
  }

  const needsSource =
    mode === "overlay" || mode === "reference" || mode === "remake";
  const showGenre = mode === "generate" || mode === "overlay";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      <header className="mb-10 sm:mb-14">
        <p className="mb-3 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-mute">
          Midiverse · sistema nostro
        </p>
        <h1 className="font-display text-[clamp(2.8rem,10vw,4.4rem)] leading-[0.92] tracking-[-0.02em]">
          Vocal Studio
        </h1>
        <p className="mt-4 max-w-lg text-[1.02rem] leading-relaxed text-mute">
          Ogni remake è diverso: voci, melodia, timing umani. Hook corti su
          note, non parlato piatto.
        </p>
      </header>

      <section className="flex flex-col gap-8">
        <div>
          <h2 className="mb-3 text-sm font-medium text-mute">1 · Cosa vuoi fare</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                {
                  id: "remake" as const,
                  title: "Remake (stems)",
                  blurb: "Parole nuove · note/durata · voce vicina (link opzionale)",
                },
                {
                  id: "reference" as const,
                  title: "Simile (mood)",
                  blurb: "Stesso mood, stem dry + wet",
                },
                {
                  id: "generate" as const,
                  title: "Solo vocal",
                  blurb: "Dal genere e dalla variazione",
                },
                {
                  id: "overlay" as const,
                  title: "Su mia traccia",
                  blurb: "Vocal sul tuo beat",
                },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  mode === m.id
                    ? "border-accent/50 bg-accent/10"
                    : "border-surface-border bg-surface hover:border-accent/30"
                }`}
              >
                <div className="font-semibold">{m.title}</div>
                <p className="mt-1 text-[0.75rem] text-mute">{m.blurb}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium text-mute">2 · Colore voce</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {SINGERS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSingerId(s.id)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  singerId === s.id
                    ? "border-accent/50 bg-accent/10"
                    : "border-surface-border bg-surface hover:border-accent/30"
                }`}
              >
                <div className="font-semibold">{s.label}</div>
                <p className="mt-1 text-[0.75rem] text-mute">{s.blurb}</p>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[0.75rem] text-mute">
            Il remake usa una voce leggermente diversa (neighbor) sullo stesso
            mood — non clona star.
          </p>
        </div>

        {needsSource && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="mb-3 text-sm font-medium text-mute">
                3 · Link YouTube (riferimento)
              </h2>
              <input
                type="url"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="https://youtu.be/… oppure youtube.com/watch?v=…"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3.5 text-[0.95rem] text-ink outline-none ring-accent/40 placeholder:text-mute/70 focus:border-accent/50 focus:ring-2"
              />
            </div>
            <div>
              <h2 className="mb-3 text-sm font-medium text-mute">
                oppure carica un file
              </h2>
              <label className="flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-dashed border-surface-border bg-surface px-4 py-5 transition hover:border-accent/40">
                <span className="text-sm font-medium">
                  {track ? track.name : "WAV / MP3 / AIFF"}
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setTrack(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>
        )}

        {showGenre && (
          <>
            <div>
              <h2 className="mb-3 text-sm font-medium text-mute">Genere</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {GENRES.map((g) => {
                  const active = g.id === genre.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onGenreChange(g.id)}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-accent/50 bg-accent/10"
                          : "border-surface-border bg-surface hover:border-accent/30"
                      }`}
                    >
                      <div className="text-sm font-semibold">{g.label}</div>
                      <div className="mt-1 text-[0.72rem] leading-snug text-mute">
                        {g.blurb}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-sm font-medium text-mute">
                Variazione · {genre.label}
              </h2>
              <div className="flex flex-col gap-2">
                {genre.variations.map((v) => {
                  const active = v.id === variation.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariationId(v.id)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-accent/50 bg-accent/10"
                          : "border-surface-border bg-surface hover:border-accent/30"
                      }`}
                    >
                      <div className="font-semibold">{v.label}</div>
                      <p className="mt-1 text-sm text-mute">{v.mood}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div>
          <h2 className="mb-3 text-sm font-medium text-mute">BPM · Chiave · Durata</h2>
          <div className="flex flex-wrap items-center gap-2">
            {BPM_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setBpm(p)}
                className={`rounded-full border px-3 py-2 text-sm ${
                  bpm === p
                    ? "border-accent bg-accent text-[#1a140e]"
                    : "border-surface-border bg-surface text-ink"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {KEYS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKeyId(k.id)}
                className={`rounded-full border px-3 py-2 text-sm ${
                  keyId === k.id
                    ? "border-accent bg-accent text-[#1a140e]"
                    : "border-surface-border bg-surface text-ink"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {LENGTHS.map((l) => (
              <button
                key={l.sec}
                type="button"
                onClick={() => setLengthSec(l.sec)}
                className={`rounded-full border px-4 py-2 text-sm ${
                  lengthSec === l.sec
                    ? "border-accent bg-accent text-[#1a140e]"
                    : "border-surface-border bg-surface text-ink"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={onGenerate}
            className="rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-[#1a140e] transition hover:brightness-110 disabled:opacity-60"
          >
            {busy
              ? "Faccio stem + remake…"
              : mode === "remake"
                ? "Remake: stems dry / wet / mix"
                : "Genera vocal stems"}
          </button>
          {error && (
            <p className="text-sm text-red-300/90" role="alert">
              {error}
            </p>
          )}
        </div>

        {analysis && (
          <div className="rounded-2xl border border-surface-border bg-surface p-4 text-sm">
            <h2 className="font-semibold">Remake plan</h2>
            <p className="mt-2 text-[0.8rem] text-accent">
              Sistema nostro (free) — parole nuove, stessa durata, stesso schema
              note, voce leggermente diversa.
            </p>
            {(analysis.sourceTitle || analysis.sourceAuthor) && (
              <p className="mt-2 text-mute">
                Riferimento:{" "}
                <span className="text-ink">
                  {[analysis.sourceTitle, analysis.sourceAuthor]
                    .filter(Boolean)
                    .join(" — ")}
                </span>
              </p>
            )}
            <p className="mt-2 text-mute">
              {analysis.bpm ? `${Math.round(analysis.bpm)} BPM` : ""}
              {analysis.key ? ` · ${analysis.key}` : ""}
              {analysis.lengthSec ? ` · ${analysis.lengthSec}s` : ""}
              {analysis.dryVoice ? ` · voce ${analysis.dryVoice}` : ""}
              {analysis.engine ? ` · ${analysis.engine}` : ""}
            </p>
            {analysis.refDry && (
              <p className="mt-2 text-mute">
                Mood ref:{" "}
                <span className="text-ink">
                  {[...(analysis.refDry || []), ...(analysis.refWet || [])].join(
                    " / "
                  )}
                </span>
              </p>
            )}
            {(analysis.dry || analysis.wet) && (
              <p className="mt-2 text-mute">
                Parole nuove:{" "}
                <span className="text-ink">
                  {[...(analysis.dry || []), ...(analysis.wet || [])].join(" / ")}
                </span>
              </p>
            )}
            <p className="mt-2 text-[0.75rem] text-mute">
              {analysis.note}
            </p>
          </div>
        )}

        {(dryUrl || wetUrl || mixUrl) && (
          <div className="flex flex-col gap-4">
            {dryUrl && (
              <div className="rounded-2xl border border-surface-border bg-surface p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="font-semibold">Stem dry (call)</h2>
                  <a
                    href={dryUrl}
                    download="stem-dry.mp3"
                    className="text-sm text-accent underline-offset-2 hover:underline"
                  >
                    Scarica
                  </a>
                </div>
                <audio
                  controls
                  playsInline
                  className="w-full"
                  src={dryUrl}
                  onPlay={exclusivePlay}
                />
              </div>
            )}
            {wetUrl && (
              <div className="rounded-2xl border border-surface-border bg-surface p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="font-semibold">Stem wet (response)</h2>
                  <a
                    href={wetUrl}
                    download="stem-wet.mp3"
                    className="text-sm text-accent underline-offset-2 hover:underline"
                  >
                    Scarica
                  </a>
                </div>
                <audio
                  controls
                  playsInline
                  className="w-full"
                  src={wetUrl}
                  onPlay={exclusivePlay}
                />
              </div>
            )}
            {mixUrl && (
              <div className="rounded-2xl border border-surface-border bg-surface p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="font-semibold">Mix remake</h2>
                  <a
                    href={mixUrl}
                    download="stem-mix.mp3"
                    className="text-sm text-accent underline-offset-2 hover:underline"
                  >
                    Scarica
                  </a>
                </div>
                <audio
                  key={mixUrl}
                  controls
                  playsInline
                  autoPlay
                  className="w-full"
                  src={mixUrl}
                  onPlay={exclusivePlay}
                />
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="mt-14 text-[0.75rem] leading-relaxed text-mute">
        Remake = stem dry + wet originali. Stessa durata e schema note della
        chiave; parole diverse; voce neighbor. Non campioniamo / non cloniamo
        cantanti famosi. Fase 2 (locale): estrazione melodia reale da audio
        caricato (Basic Pitch) per lock note ancora più stretto.
      </footer>
    </main>
  );
}
