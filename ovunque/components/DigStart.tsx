"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChartTable } from "@/components/ChartTable";
import { useCollection } from "@/components/CollectionProvider";
import { encodeSeedsParam, stashDigPicks } from "@/lib/digPickBag";
import { pickExactTrack } from "@/lib/screenshotExact";
import { parseScreenshotLines } from "@/lib/screenshotParse";
import type { Track } from "@/lib/types";

type Mode = "auto" | "artist" | "label";

const MODES: { id: Mode; label: string }[] = [
  { id: "auto", label: "Tutto" },
  { id: "artist", label: "Artista" },
  { id: "label", label: "Label" },
];

const MAX_PICKS = 6;

/**
 * 1) Cerca / screenshot / foto → tracce ESATTE
 * 2) Cuore o seleziona → poi Short / Long / Station (suggerite)
 */
export function DigStart({ className = "" }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { has, ready } = useCollection();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("auto");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  /** true dopo screenshot/foto: Station bloccata finché cuore/pick */
  const [gateSuggest, setGateSuggest] = useState(false);

  useEffect(() => {
    const initial = params.get("q");
    if (initial && initial.trim()) {
      setQ(initial);
      void runStart(initial, "auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuore sulla wishlist → conta come selezione per list/station
  useEffect(() => {
    if (!ready || !tracks.length) return;
    setPicked((prev) => {
      const hearted = tracks.filter((t) => has(t.id)).map((t) => t.id);
      if (!hearted.length) return prev;
      const next = [...prev];
      for (const id of hearted) {
        if (!next.includes(id) && next.length < MAX_PICKS) next.push(id);
      }
      return next;
    });
  }, [ready, tracks, has]);

  function activatePick(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev;
      if (prev.length >= MAX_PICKS) return prev;
      return [...prev, id];
    });
  }

  function togglePick(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PICKS) return prev;
      return [...prev, id];
    });
  }

  function onHeartToggle(track: Track, wishlisted: boolean) {
    if (wishlisted) activatePick(track.id);
    else {
      setPicked((prev) => prev.filter((x) => x !== track.id));
    }
  }

  async function runStart(query: string, m: Mode = mode) {
    const term = query.trim();
    if (!term) {
      setStatus("Scrivi artista, label, titolo o incolla un link (YouTube, Bandcamp…).");
      return;
    }
    setBusy(true);
    setStatus("Cerco…");
    setTracks([]);
    setPicked([]);
    setKind("");
    setGateSuggest(false);
    try {
      const res = await fetch("/api/live/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: term, mode: m, limit: 28 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data.error || `Errore ${res.status}`);
        return;
      }
      const hits = Array.isArray(data.tracks) ? (data.tracks as Track[]) : [];
      setTracks(hits);
      setKind(data.kind || m);
      setStatus(
        hits.length
          ? `${data.note || "Ok"} — cuore o seleziona, poi Short / Long / Station`
          : "Nessun hit — prova artista, label: Perlon, o un link YouTube",
      );
    } catch {
      setStatus("Rete lenta — riprova");
    } finally {
      setBusy(false);
    }
  }

  async function onScreenshot(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      setStatus("Serve un’immagine (PNG / JPG).");
      return;
    }
    setBusy(true);
    setStatus("OCR screenshot / foto…");
    setTracks([]);
    setPicked([]);
    setGateSuggest(true);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const result = await Tesseract.recognize(file, "eng");
      const found = parseScreenshotLines(result.data.text || "", 8);
      if (!found.length) {
        setStatus("Screenshot poco chiaro — prova chart/wishlist nitida");
        return;
      }
      setStatus(`OCR: ${found.length} tracce — match esatto…`);
      const hits: Track[] = [];
      const seen = new Set<string>();
      let missed = 0;
      for (const line of found) {
        const res = await fetch(
          `/api/live/search?q=${encodeURIComponent(line.query)}&limit=16`,
        );
        const data = await res.json().catch(() => ({}));
        const candidates = Array.isArray(data.tracks)
          ? (data.tracks as Track[])
          : [];
        const pick = pickExactTrack(line, candidates);
        if (!pick) {
          missed++;
          continue;
        }
        if (seen.has(pick.track.id)) continue;
        seen.add(pick.track.id);
        hits.push(pick.track);
      }
      setTracks(hits);
      setKind("screenshot-exact");
      // Nessuna auto-selezione: list/station solo dopo cuore o tap
      setPicked([]);
      setStatus(
        hits.length
          ? `Trovate ${hits.length} traccia/e esatta/e${missed ? ` · ${missed} non in catalogo` : ""}. Cuore o seleziona → poi Short / Long / Station`
          : "OCR letto ma nessuna traccia esatta — ritaglia meglio o cerca a mano",
      );
    } catch {
      setStatus("OCR fallito — riprova");
    } finally {
      setBusy(false);
    }
  }

  function goDig(listMode: "short" | "long") {
    const seeds = tracks.filter((t) => picked.includes(t.id)).slice(0, MAX_PICKS);
    if (!seeds.length) {
      setStatus("Prima cuore o seleziona almeno 1 traccia, poi Short / Long");
      return;
    }
    const bag = stashDigPicks(listMode, seeds);
    const seedsParam = encodeSeedsParam(listMode, seeds);
    router.push(
      `/diglist?mode=${listMode}&bag=${encodeURIComponent(bag)}&seeds=${encodeURIComponent(seedsParam)}`,
    );
  }

  const pickedTracks = tracks.filter((t) => picked.includes(t.id));
  const suggestReady = pickedTracks.length > 0;

  return (
    <section
      className={`rounded-dig-lg border border-line bg-panel p-5 md:p-6 ${className}`}
    >
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
        Dig start
      </p>
      <h2 className="mt-2 font-display text-xl font-black text-mist md:text-2xl">
        Parti da tutto
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-soft">
        Screenshot / foto / link → trovi <strong className="font-semibold text-mist">quella</strong>{" "}
        traccia. Poi cuore o seleziona: così si attivano Short list, Long list o Station con le
        suggerite (rete label).
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-dig px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider transition ${
              mode === m.id
                ? "bg-signal text-ink"
                : "border border-line text-muted hover:border-signal/40 hover:text-mist"
            }`}
          >
            {m.label}
          </button>
        ))}
        {kind ? (
          <span className="rounded-dig border border-signal/40 px-2 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-signal">
            {kind}
          </span>
        ) : null}
      </div>

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void runStart(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Villalobos · Perlon · https://youtu.be/… · bandcamp / discogs…"
          className="w-full flex-1 rounded-dig border border-line bg-ink px-4 py-3 text-sm text-mist outline-none placeholder:text-muted focus:border-signal/60"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-dig bg-signal px-5 py-3 text-sm font-bold text-ink transition hover:bg-signal-hi disabled:opacity-50"
        >
          {busy ? "…" : "Cerca"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => void onScreenshot(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-dig border border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted hover:border-signal hover:text-signal disabled:opacity-50"
        >
          Screenshot / foto
        </button>
        <span className="text-[0.7rem] text-muted">
          Esempi:{" "}
          <button
            type="button"
            className="text-signal underline"
            onClick={() => {
              setQ("Ricardo Villalobos");
              setMode("artist");
              void runStart("Ricardo Villalobos", "artist");
            }}
          >
            Villalobos
          </button>
          {" · "}
          <button
            type="button"
            className="text-signal underline"
            onClick={() => {
              setQ("Perlon");
              setMode("label");
              void runStart("Perlon", "label");
            }}
          >
            Perlon
          </button>
          {" · "}
          <button
            type="button"
            className="text-signal underline"
            onClick={() => {
              setQ("All Inn Records");
              setMode("label");
              void runStart("All Inn Records", "label");
            }}
          >
            All Inn
          </button>
        </span>
      </div>

      {status ? <p className="mt-4 text-sm text-soft">{status}</p> : null}

      {tracks.length > 0 ? (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-black text-mist">
              {gateSuggest ? "Tracce esatte" : "Risultati"} · cuore o tap (
              {picked.length}/{MAX_PICKS})
            </h3>
            {suggestReady ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => goDig("short")}
                  className="rounded-dig bg-signal px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink"
                >
                  Short list
                </button>
                <button
                  type="button"
                  onClick={() => goDig("long")}
                  className="rounded-dig border border-signal/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-signal"
                >
                  Long list
                </button>
              </div>
            ) : (
              <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">
                Cuore o seleziona → Short / Long / Station
              </p>
            )}
          </div>
          <ul className="mb-4 flex flex-wrap gap-1.5">
            {tracks.slice(0, 28).map((t) => {
              const on = picked.includes(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => togglePick(t.id)}
                    className={`max-w-[14rem] truncate rounded-dig border px-2 py-1 text-left text-[0.7rem] transition ${
                      on
                        ? "border-signal bg-signal/15 text-mist"
                        : "border-line text-muted hover:border-signal/40"
                    }`}
                    title={`${t.artist} — ${t.title}`}
                  >
                    {on ? "✓ " : ""}
                    {t.artist} — {t.title}
                  </button>
                </li>
              );
            })}
          </ul>
          <ChartTable
            tracks={tracks}
            showRank={false}
            onHeartToggle={onHeartToggle}
            stationUnlocked={
              gateSuggest ? (id) => picked.includes(id) : undefined
            }
          />
        </div>
      ) : null}
    </section>
  );
}
