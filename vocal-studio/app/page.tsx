"use client";

import { useMemo, useState } from "react";
import { GENRES } from "@/lib/genres";

const LENGTHS = [
  { sec: 16, label: "16s" },
  { sec: 32, label: "32s" },
  { sec: 48, label: "48s" },
  { sec: 64, label: "64s" },
];

type Analysis = {
  bpm?: number;
  label?: string;
  bank?: string;
  dry?: string[];
  wet?: string[];
  note?: string;
};

export default function VocalStudioPage() {
  const [genreId, setGenreId] = useState(GENRES[0].id);
  const genre = useMemo(
    () => GENRES.find((g) => g.id === genreId) || GENRES[0],
    [genreId]
  );
  const [variationId, setVariationId] = useState(GENRES[0].variations[0].id);
  const variation =
    genre.variations.find((v) => v.id === variationId) || genre.variations[0];

  const [mode, setMode] = useState<"generate" | "overlay" | "reference">(
    "reference"
  );
  const [lengthSec, setLengthSec] = useState(32);
  const [track, setTrack] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  function onGenreChange(id: string) {
    setGenreId(id);
    const g = GENRES.find((x) => x.id === id)!;
    setVariationId(g.variations[0].id);
  }

  async function onGenerate() {
    setBusy(true);
    setError(null);
    setAnalysis(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    try {
      if ((mode === "overlay" || mode === "reference") && !track) {
        throw new Error(
          mode === "reference"
            ? "Carica la traccia col vocal che ti piace."
            : "Carica una traccia per aggiungere il vocal."
        );
      }
      const body = new FormData();
      body.set("genreId", genre.id);
      body.set("variationId", variation.id);
      body.set("lengthSec", String(lengthSec));
      body.set("mode", mode);
      if (track) body.set("track", track);

      const res = await fetch("/api/generate", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Errore ${res.status}`);
      }
      const encoded = res.headers.get("X-Vocal-Analysis");
      if (encoded) {
        try {
          setAnalysis(JSON.parse(decodeURIComponent(encoded)));
        } catch {
          /* ignore */
        }
      }
      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generazione fallita");
    } finally {
      setBusy(false);
    }
  }

  const needsUpload = mode === "overlay" || mode === "reference";
  const showGenre = mode !== "reference";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      <header className="mb-10 sm:mb-14">
        <p className="mb-3 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-mute">
          Midiverse
        </p>
        <h1 className="font-display text-[clamp(2.8rem,10vw,4.4rem)] leading-[0.92] tracking-[-0.02em]">
          Vocal Studio
        </h1>
        <p className="mt-4 max-w-lg text-[1.02rem] leading-relaxed text-mute">
          Ti piace il vocal di una traccia? Caricala: ti diamo un vocal{" "}
          <em className="text-ink not-italic">simile di mood</em>, originale e
          usabile — non una copia.
        </p>
      </header>

      <section className="flex flex-col gap-8">
        <div>
          <h2 className="mb-3 text-sm font-medium text-mute">1 · Cosa vuoi fare</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                {
                  id: "reference" as const,
                  title: "Simile a questo",
                  blurb: "Upload riferimento → vocal originale nello stesso mood",
                },
                {
                  id: "generate" as const,
                  title: "Solo vocal",
                  blurb: "Dal genere e dalla variazione",
                },
                {
                  id: "overlay" as const,
                  title: "Su mia traccia",
                  blurb: "Metti un vocal sul tuo beat",
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

        {needsUpload && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-mute">
              {mode === "reference"
                ? "2 · Traccia di riferimento (col vocal che ti piace)"
                : "2 · La tua traccia"}
            </h2>
            <label className="flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-dashed border-surface-border bg-surface px-4 py-5 transition hover:border-accent/40">
              <span className="text-sm font-medium">
                {track ? track.name : "WAV / MP3 / AIFF"}
              </span>
              <span className="text-[0.75rem] text-mute">
                {mode === "reference"
                  ? "Ascoltiamo mood/tempo/timbrica — non copiamo il testo"
                  : "Max consigliato ~3 min per la demo"}
              </span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => setTrack(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        )}

        {showGenre && (
          <>
            <div>
              <h2 className="mb-3 text-sm font-medium text-mute">
                {needsUpload ? "3" : "2"} · Genere
              </h2>
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
                {needsUpload ? "4" : "3"} · Variazione · {genre.label}
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
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold">{v.label}</span>
                        <span className="text-[0.7rem] uppercase tracking-wider text-mute">
                          {v.voice}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-mute">{v.mood}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div>
          <h2 className="mb-3 text-sm font-medium text-mute">
            {mode === "reference" ? "3" : needsUpload ? "5" : "4"} · Lunghezza
          </h2>
          <div className="flex flex-wrap gap-2">
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
              ? mode === "reference"
                ? "Ascolto il riferimento e genero…"
                : "Genero il vocal…"
              : mode === "reference"
                ? "Dammi un vocal simile (originale)"
                : mode === "overlay"
                  ? "Metti il vocal sulla traccia"
                  : "Genera vocal"}
          </button>
          {error && (
            <p className="text-sm text-red-300/90" role="alert">
              {error}
            </p>
          )}
        </div>

        {analysis && (
          <div className="rounded-2xl border border-surface-border bg-surface p-4 text-sm">
            <h2 className="font-semibold">Cosa abbiamo sentito</h2>
            <p className="mt-2 text-mute">
              Mood: <span className="text-ink">{analysis.label}</span>
              {analysis.bpm ? ` · ~${Math.round(analysis.bpm)} BPM` : ""}
            </p>
            {(analysis.dry || analysis.wet) && (
              <p className="mt-2 text-mute">
                Frasi originali:{" "}
                <span className="text-ink">
                  {[...(analysis.dry || []), ...(analysis.wet || [])].join(" / ")}
                </span>
              </p>
            )}
            <p className="mt-2 text-[0.75rem] text-mute">
              {analysis.note ||
                "Mood dal riferimento — testo nuovo, usabile in produzione."}
            </p>
          </div>
        )}

        {audioUrl && (
          <div className="rounded-2xl border border-surface-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Anteprima</h2>
              <a
                href={audioUrl}
                download={`vocal-studio-${mode}.mp3`}
                className="text-sm text-accent underline-offset-2 hover:underline"
              >
                Scarica MP3
              </a>
            </div>
            <audio
              key={audioUrl}
              controls
              playsInline
              autoPlay
              className="w-full"
              src={audioUrl}
            />
          </div>
        )}
      </section>

      <footer className="mt-14 text-[0.75rem] leading-relaxed text-mute">
        Modalità riferimento: analizziamo tempo/energia/timbrica e generiamo un
        vocal nuovo nello stesso mood. Non cloniamo la voce né il testo della
        traccia caricata. Demo TTS — motore da studio collegabile dopo.
      </footer>
    </main>
  );
}
