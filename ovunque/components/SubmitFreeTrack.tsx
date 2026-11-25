"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Track } from "@/lib/types";

type Props = {
  onSubmitted?: (track: Track) => void;
};

/** Invia un free download → entra in Free chart (serve login per la cronologia). */
export function SubmitFreeTrack({ onSubmitted }: Props) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [genre, setGenre] = useState("Electronic");
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) {
      setMsg("Accedi per aggiungere free drop in chart (cronologia community).");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/free", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, artist, downloadUrl, genre }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(
          data.error === "download_https_required"
            ? "Serve un link https al free download (SoundCloud / Bandcamp / …)."
            : "Invio fallito — controlla titolo, artista e URL.",
        );
        return;
      }
      setMsg("In chart Free ✓ — più bump, più sale.");
      setTitle("");
      setArtist("");
      setDownloadUrl("");
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
        Metti un free in chart
      </h2>
      <p className="mt-2 text-sm text-soft">
        Solo download gratis reali. Entra nella lane <strong className="text-mist">Free</strong>.
        Navigare è libero; per pubblicare il drop serve login.
      </p>

      {signedIn === false ? (
        <p className="mt-4 text-sm text-ember">
          Guest mode: ascolti e cerchi senza account.{" "}
          <Link href="/account" className="font-bold text-signal underline">
            Accedi
          </Link>{" "}
          per free chart + wishlist cloud.
        </p>
      ) : null}

      <form onSubmit={(e) => void submit(e)} className="mt-5 grid gap-3 sm:grid-cols-2">
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
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted">URL free download (https)</span>
          <input
            required
            type="url"
            placeholder="https://soundcloud.com/… o bandcamp.com/…"
            value={downloadUrl}
            onChange={(e) => setDownloadUrl(e.target.value)}
            className="mt-1 w-full rounded-dig border border-line bg-ink px-3 py-2.5 text-mist outline-none focus:border-signal/60"
          />
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
            disabled={busy || signedIn === false}
            className="w-full rounded-dig bg-signal px-4 py-2.5 text-sm font-bold text-ink hover:bg-signal-hi disabled:opacity-50"
          >
            {busy ? "Invio…" : "Aggiungi a Free chart"}
          </button>
        </div>
      </form>
      {msg ? <p className="mt-3 text-sm text-soft">{msg}</p> : null}
    </section>
  );
}
