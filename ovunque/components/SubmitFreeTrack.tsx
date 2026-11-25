"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Track } from "@/lib/types";

type Props = {
  onSubmitted?: (track: Track) => void;
};

/** Carica audio + copertina → Free chart (login richiesto). */
export function SubmitFreeTrack({ onSubmitted }: Props) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("Electronic");
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        if (!cancelled) setSignedIn(!!data.signedIn);
      } catch {
        if (!cancelled) setSignedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cover) {
      setCoverPreview("");
      return;
    }
    const url = URL.createObjectURL(cover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) {
      setMsg("Accedi per caricare un free drop in chart.");
      return;
    }
    if (!audio || !cover) {
      setMsg("Serve il file audio e la copertina.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const form = new FormData();
      form.set("title", title);
      form.set("artist", artist);
      form.set("genre", genre);
      form.set("audio", audio);
      form.set("cover", cover);
      const res = await fetch("/api/free", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        const err = String(data.error || "");
        setMsg(
          err === "audio_and_cover_required"
            ? "Carica audio + copertina insieme."
            : err === "audio_too_large"
              ? "Audio max 25 MB."
              : err === "cover_too_large"
                ? "Copertina max 2 MB."
                : err === "person_required" || err === "preview_stage_blocked"
                  ? "Serve login (non preview) per pubblicare."
                  : "Invio fallito — controlla file e campi.",
        );
        return;
      }
      setMsg("In chart Free ✓ — audio + cover caricati.");
      setTitle("");
      setArtist("");
      setAudio(null);
      setCover(null);
      onSubmitted?.(data.track as Track);
    } catch {
      setMsg("Offline — riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-dig-lg border border-line bg-panel p-5 md:p-6">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
        Free download
      </p>
      <h2 className="mt-2 font-display text-xl font-black text-mist">
        Carica audio + copertina
      </h2>
      <p className="mt-2 text-sm text-soft">
        Niente link esterni: carichi il file e la cover, entra in chart{" "}
        <strong className="text-mist">Free</strong>. Serve login.
      </p>

      {signedIn === false ? (
        <p className="mt-4 text-sm text-ember">
          Guest: ascolti senza account.{" "}
          <Link href="/account" className="font-bold text-signal underline">
            Accedi
          </Link>{" "}
          per pubblicare free drop.
        </p>
      ) : null}

      <form onSubmit={(e) => void submit(e)} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted">Titolo</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-dig border border-line bg-ink px-3 py-2.5 text-mist outline-none focus:border-signal/60"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Artista</span>
          <input
            required
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="mt-1 w-full rounded-dig border border-line bg-ink px-3 py-2.5 text-mist outline-none focus:border-signal/60"
          />
        </label>

        <label className="block text-sm sm:col-span-1">
          <span className="text-muted">File audio (mp3 / wav / flac · max 25 MB)</span>
          <input
            required
            type="file"
            accept="audio/*,.mp3,.wav,.flac,.aac,.ogg"
            onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-soft file:mr-3 file:rounded-dig file:border-0 file:bg-signal file:px-3 file:py-2 file:text-sm file:font-bold file:text-ink"
          />
          {audio ? (
            <span className="mt-1 block truncate text-xs text-muted">{audio.name}</span>
          ) : null}
        </label>

        <label className="block text-sm">
          <span className="text-muted">Copertina (jpg / png / webp · max 2 MB)</span>
          <input
            required
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-soft file:mr-3 file:rounded-dig file:border-0 file:bg-row file:px-3 file:py-2 file:text-sm file:font-bold file:text-mist"
          />
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverPreview}
              alt=""
              className="mt-2 aspect-square w-28 object-cover border border-line"
            />
          ) : null}
        </label>

        <label className="block text-sm">
          <span className="text-muted">Genere</span>
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="mt-1 w-full rounded-dig border border-line bg-ink px-3 py-2.5 text-mist outline-none focus:border-signal/60"
          />
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy || signedIn === false || !audio || !cover}
            className="w-full rounded-dig bg-signal px-4 py-2.5 text-sm font-bold text-ink hover:bg-signal-hi disabled:opacity-50"
          >
            {busy ? "Carico…" : "Pubblica in Free chart"}
          </button>
        </div>
      </form>
      {msg ? <p className="mt-3 text-sm text-soft">{msg}</p> : null}
    </section>
  );
}
