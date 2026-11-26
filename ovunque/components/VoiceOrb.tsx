"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { replyToUtterance } from "@/lib/assistant";

type Phase = "idle" | "listening" | "thinking" | "speaking";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecEvent) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechRecCtor = new () => SpeechRec;

function getSpeechRecognition(): SpeechRecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** iOS: sblocca TTS sul tap, altrimenti parla solo dopo il primo gesto. */
function unlockSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const warm = new SpeechSynthesisUtterance(" ");
    warm.volume = 0;
    warm.rate = 2;
    warm.lang = "it-IT";
    window.speechSynthesis.speak(warm);
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

function pickItalianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "it-IT") ||
    voices.find((v) => v.lang.toLowerCase().startsWith("it")) ||
    null
  );
}

function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "it-IT";
    u.rate = 1.04;
    u.pitch = 1;
    const voice = pickItalianVoice();
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    // iOS a volte ignora speak se chiamato troppo presto dopo cancel
    window.setTimeout(() => {
      window.speechSynthesis.speak(u);
    }, 40);
  });
}

export function VoiceOrb() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [caption, setCaption] = useState("");
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRec | null>(null);
  const handlingRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  const voicesReady = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
    const warmVoices = () => {
      window.speechSynthesis?.getVoices();
      voicesReady.current = true;
    };
    warmVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", warmVoices);
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.removeEventListener?.("voiceschanged", warmVoices);
    };
  }, []);

  async function handleCommand(text: string) {
    if (handlingRef.current) return;
    handlingRef.current = true;
    setPhase("thinking");
    setCaption(text);

    const result = replyToUtterance(text);
    setPhase("speaking");
    setCaption(result.text);
    await speak(result.text);

    if (result.action.type === "navigate") {
      router.push(result.action.href);
    }

    setPhase("idle");
    // lascia la risposta un attimo, poi pulisci
    window.setTimeout(() => {
      if (phaseRef.current === "idle") setCaption("");
    }, 2200);
    handlingRef.current = false;
  }

  function stopListening() {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
  }

  function startListening() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setSupported(false);
      setPhase("speaking");
      setCaption("Su questo iPhone il microfono web non c’è. Aggiorna iOS o Safari.");
      void speak("Su questo iPhone il microfono web non è disponibile. Aggiorna Safari.");
      window.setTimeout(() => {
        setPhase("idle");
        setCaption("");
      }, 2800);
      return;
    }

    setCaption("Parla ora…");
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }

    const rec = new Ctor();
    rec.lang = "it-IT";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (ev) => {
      let interim = "";
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const chunk = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      const shown = (finalText || interim).trim();
      if (shown) setCaption(shown);
      if (finalText.trim()) {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
        void handleCommand(finalText.trim());
      }
    };

    rec.onerror = (ev) => {
      if (ev.error === "aborted") return;
      const msg =
        ev.error === "not-allowed"
          ? "Permetti il microfono in Safari, poi ritocca il cerchio."
          : ev.error === "no-speech"
            ? "Non ho sentito nulla. Tocca e riprova."
            : "Non ho capito. Tocca e riprova.";
      setCaption(msg);
      setPhase("speaking");
      void speak(msg).then(() => {
        setPhase("idle");
        window.setTimeout(() => {
          if (phaseRef.current === "idle") setCaption("");
        }, 1800);
      });
    };

    rec.onend = () => {
      if (!handlingRef.current && phaseRef.current === "listening") {
        setPhase("idle");
      }
    };

    recRef.current = rec;
    setPhase("listening");
    try {
      rec.start();
    } catch {
      setCaption("Microfono occupato. Ritocca.");
      setPhase("idle");
      void speak("Microfono occupato. Ritocca il cerchio.");
    }
  }

  function onOrbPress() {
    // Sempre sblocca la voce sul tap (iPhone)
    unlockSpeech();

    if (phase === "listening") {
      stopListening();
      setPhase("idle");
      setCaption("");
      return;
    }

    if (phase === "speaking" || phase === "thinking") {
      window.speechSynthesis?.cancel();
      stopListening();
      handlingRef.current = false;
      setPhase("idle");
      setCaption("");
      return;
    }

    // idle → comando vocale
    startListening();
  }

  const live = phase !== "idle";
  const status =
    phase === "listening"
      ? "Ascolto"
      : phase === "thinking"
        ? "Ok…"
        : phase === "speaking"
          ? "Risposta"
          : supported
            ? "Comando vocale"
            : "Voce non supportata";

  return (
    <div className="voice-dock" aria-live="polite">
      {(caption || live) && (
        <div className={`voice-hud ${phase === "listening" ? "voice-hud--live" : ""}`}>
          <p className="voice-hud__status">{status}</p>
          {caption ? <p className="voice-hud__text">{caption}</p> : null}
        </div>
      )}

      <button
        type="button"
        className={`voice-orb ${live ? "voice-orb--live" : ""} ${
          phase === "listening" ? "voice-orb--pulse" : ""
        } ${phase === "speaking" ? "voice-orb--speak" : ""}`}
        aria-label={
          phase === "listening"
            ? "Interrompi ascolto"
            : "Comando vocale: tocca e parla"
        }
        onClick={onOrbPress}
      >
        <span className="voice-orb__ring" aria-hidden />
        <span className="voice-orb__core" aria-hidden>
          {phase === "listening" ? (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
              <rect x="4" y="8" width="3" height="8" rx="1.5" fill="currentColor">
                <animate attributeName="height" values="6;12;6" dur="0.7s" repeatCount="indefinite" />
                <animate attributeName="y" values="9;6;9" dur="0.7s" repeatCount="indefinite" />
              </rect>
              <rect x="10.5" y="5" width="3" height="14" rx="1.5" fill="currentColor">
                <animate attributeName="height" values="10;16;10" dur="0.55s" repeatCount="indefinite" />
                <animate attributeName="y" values="7;4;7" dur="0.55s" repeatCount="indefinite" />
              </rect>
              <rect x="17" y="8" width="3" height="8" rx="1.5" fill="currentColor">
                <animate attributeName="height" values="8;12;8" dur="0.65s" repeatCount="indefinite" />
                <animate attributeName="y" values="8;6;8" dur="0.65s" repeatCount="indefinite" />
              </rect>
            </svg>
          ) : phase === "speaking" ? (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
              <path
                d="M4 12h2.2l2-5 3.2 10 2.4-7.5L16.2 12H20"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
              <path
                d="M12 3a3.2 3.2 0 0 0-3.2 3.2v5.1a3.2 3.2 0 1 0 6.4 0V6.2A3.2 3.2 0 0 0 12 3Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M6.5 11.2a5.5 5.5 0 0 0 11 0M12 16.7v3.3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}
