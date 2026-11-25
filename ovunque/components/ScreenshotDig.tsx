"use client";

import { useCallback, useRef, useState } from "react";
import { ChartTable } from "@/components/ChartTable";
import { parseScreenshotQueries } from "@/lib/screenshotParse";
import type { Track } from "@/lib/types";

type Props = {
  className?: string;
};

/**
 * Carica uno screenshot delle tracce preferite → OCR → cerca musica simile.
 * L'immagine resta sul device (OCR in browser).
 */
export function ScreenshotDig({ className = "" }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [queries, setQueries] = useState<string[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const reset = useCallback(() => {
    setBusy(false);
    setStatus("");
    setQueries([]);
    setTracks([]);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [preview]);

  async function onFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      setStatus("Serve un’immagine (PNG / JPG / WebP).");
      return;
    }
    if (file.size > 12_000_000) {
      setStatus("Screenshot troppo grande (max 12 MB).");
      return;
    }

    reset();
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    setStatus("Leggo lo screenshot…");

    try {
      const Tesseract = (await import("tesseract.js")).default;
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setStatus(`OCR ${Math.round(m.progress * 100)}%…`);
          }
        },
      });
      const text = result.data.text || "";
      const found = parseScreenshotQueries(text, 8);
      setQueries(found);

      if (found.length === 0) {
        setStatus(
          "Non ho letto titoli chiari — prova uno screenshot più nitido (chart / wishlist).",
        );
        setBusy(false);
        return;
      }

      setStatus(`Trovate ${found.length} tracce — cerco simili…`);
      const hits: Track[] = [];
      const seen = new Set<string>();

      for (const q of found) {
        try {
          const res = await fetch(
            `/api/live/search?q=${encodeURIComponent(q)}&limit=4`,
          );
          const data = await res.json();
          if (!res.ok || !Array.isArray(data.tracks)) continue;
          for (const t of data.tracks as Track[]) {
            if (seen.has(t.id)) continue;
            seen.add(t.id);
            hits.push(t);
          }
        } catch {
          /* next query */
        }
      }

      setTracks(hits.slice(0, 28));
      setStatus(
        hits.length > 0
          ? `Da screenshot → ${hits.length} dig simili. Ascolta, salva, Short/Long list.`
          : "OCR ok ma nessun hit live — riprova o cerca a mano.",
      );
    } catch {
      setStatus("OCR fallito — riprova con un altro screenshot.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`rounded-dig-lg border border-line bg-panel p-5 md:p-6 ${className}`}
    >
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
        Dig from screenshot
      </p>
      <h2 className="mt-2 font-display text-xl font-black text-mist md:text-2xl">
        Carica uno screenshot
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-soft">
        Delle tue tracce preferite (chart, wishlist, Beatport, telefono). Leggiamo i titoli
        e partiamo con la ricerca di musica simile — l’immagine non lascia il tuo device.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic"
          className="sr-only"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-dig bg-signal px-5 py-3 text-sm font-bold text-ink transition hover:bg-signal-hi disabled:opacity-50"
        >
          {busy ? "Analizzo…" : "Carica screenshot"}
        </button>
        {tracks.length > 0 || preview ? (
          <button
            type="button"
            onClick={reset}
            className="rounded-dig border border-line px-4 py-3 text-sm font-semibold text-muted hover:border-signal hover:text-signal"
          >
            Reset
          </button>
        ) : null}
      </div>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Screenshot caricato"
          className="mt-5 max-h-48 w-auto max-w-full rounded-dig border border-line object-contain"
        />
      ) : null}

      {status ? <p className="mt-4 text-sm text-soft">{status}</p> : null}

      {queries.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {queries.map((q) => (
            <span
              key={q}
              className="rounded-dig border border-line px-2 py-1 text-[0.7rem] text-muted"
            >
              {q}
            </span>
          ))}
        </div>
      ) : null}

      {tracks.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-3 font-display text-lg font-black text-mist">
            Musica simile dallo screenshot
          </h3>
          <ChartTable tracks={tracks} showRank={false} />
        </div>
      ) : null}
    </section>
  );
}
