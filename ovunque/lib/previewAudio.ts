/**
 * Un solo <Audio> globale in tutta l'app.
 * Qualsiasi ▶ chiama playPreview — i precedenti si fermano sempre.
 */

type Listener = (playingSrc: string | null) => void;
type EndedListener = (endedSrc: string) => void;

let audio: HTMLAudioElement | null = null;
let playingSrc: string | null = null;
const listeners = new Set<Listener>();
const endedListeners = new Set<EndedListener>();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(playingSrc);
    } catch {
      /* ignore */
    }
  });
}

function ensure(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = "none";
    audio.addEventListener("ended", () => {
      const ended = playingSrc;
      playingSrc = null;
      notify();
      if (ended) {
        endedListeners.forEach((fn) => {
          try {
            fn(ended);
          } catch {
            /* ignore */
          }
        });
      }
    });
  }
  return audio;
}

export function subscribePreview(fn: Listener): () => void {
  listeners.add(fn);
  fn(playingSrc);
  return () => {
    listeners.delete(fn);
  };
}

export function subscribePreviewEnded(fn: EndedListener): () => void {
  endedListeners.add(fn);
  return () => {
    endedListeners.delete(fn);
  };
}

export function getPlayingSrc(): string | null {
  return playingSrc;
}

/** Toggle: stesso src in play → stop. Altro src → ferma e avvia. */
export async function playPreview(src: string): Promise<boolean> {
  const a = ensure();
  if (!a || !src) return false;

  if (playingSrc === src && !a.paused) {
    a.pause();
    a.currentTime = 0;
    playingSrc = null;
    notify();
    return false;
  }

  // ferma qualunque cosa (anche <audio controls> nativi)
  document.querySelectorAll("audio").forEach((el) => {
    if (el !== a) {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  });

  playingSrc = src;
  notify();
  if (a.src !== src) {
    a.src = src;
  }
  try {
    await a.play();
    return true;
  } catch {
    playingSrc = null;
    notify();
    return false;
  }
}

export function stopPreview(): void {
  const a = audio;
  if (a) {
    a.pause();
    a.currentTime = 0;
  }
  playingSrc = null;
  notify();
}

/** Hook-friendly: registra un <audio controls> nativo nel lock. */
export function bindNativeAudio(el: HTMLAudioElement | null): () => void {
  if (!el || typeof window === "undefined") return () => {};
  const onPlay = () => {
    document.querySelectorAll("audio").forEach((other) => {
      if (other !== el) {
        other.pause();
        try {
          other.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
    });
    stopPreview();
  };
  el.addEventListener("play", onPlay);
  return () => el.removeEventListener("play", onPlay);
}
