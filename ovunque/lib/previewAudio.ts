/**
 * Un solo <Audio> globale in tutta l'app.
 * Play/pause, seek nella traccia, opzionale coda prev/next.
 */

export type QueueTrack = {
  id: string;
  title: string;
  artist: string;
  previewUrl: string;
  artworkUrl?: string;
};

type PlayListener = (playingSrc: string | null, playingId: string | null) => void;
type EndedListener = (endedSrc: string, endedId: string | null) => void;

export type PlayerSnapshot = {
  playing: boolean;
  src: string | null;
  id: string | null;
  title: string | null;
  artist: string | null;
  artworkUrl: string | null;
  currentTime: number;
  duration: number;
  queue: QueueTrack[];
  index: number;
};

type ProgressListener = (state: PlayerSnapshot) => void;

let audio: HTMLAudioElement | null = null;
let playingSrc: string | null = null;
let playingId: string | null = null;
let metaTitle: string | null = null;
let metaArtist: string | null = null;
let metaArt: string | null = null;
let queue: QueueTrack[] = [];
let queueIndex = -1;

const playListeners = new Set<PlayListener>();
const endedListeners = new Set<EndedListener>();
const progressListeners = new Set<ProgressListener>();
let progressTimer: number | null = null;

function snapshot(): PlayerSnapshot {
  const a = audio;
  return {
    playing: !!(a && !a.paused && playingSrc),
    src: playingSrc,
    id: playingId,
    title: metaTitle,
    artist: metaArtist,
    artworkUrl: metaArt,
    currentTime: a?.currentTime ?? 0,
    duration: Number.isFinite(a?.duration) ? a!.duration : 0,
    queue: queue.slice(),
    index: queueIndex,
  };
}

function notifyPlay() {
  playListeners.forEach((fn) => {
    try {
      fn(playingSrc, playingId);
    } catch {
      /* ignore */
    }
  });
  notifyProgress();
}

function notifyProgress() {
  const snap = snapshot();
  progressListeners.forEach((fn) => {
    try {
      fn(snap);
    } catch {
      /* ignore */
    }
  });
}

function startProgressLoop() {
  if (typeof window === "undefined") return;
  if (progressTimer != null) return;
  progressTimer = window.setInterval(() => {
    if (!audio || audio.paused) return;
    notifyProgress();
  }, 250);
}

function stopProgressLoop() {
  if (progressTimer == null || typeof window === "undefined") return;
  window.clearInterval(progressTimer);
  progressTimer = null;
}

function ensure(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
    audio.addEventListener("ended", () => {
      const ended = playingSrc;
      const endedId = playingId;
      if (queueIndex >= 0 && queueIndex < queue.length - 1) {
        void playQueueIndex(queueIndex + 1);
        if (ended) {
          endedListeners.forEach((fn) => {
            try {
              fn(ended, endedId);
            } catch {
              /* ignore */
            }
          });
        }
        return;
      }
      playingSrc = null;
      playingId = null;
      stopProgressLoop();
      notifyPlay();
      if (ended) {
        endedListeners.forEach((fn) => {
          try {
            fn(ended, endedId);
          } catch {
            /* ignore */
          }
        });
      }
    });
    audio.addEventListener("timeupdate", () => notifyProgress());
    audio.addEventListener("loadedmetadata", () => notifyProgress());
    audio.addEventListener("pause", () => {
      stopProgressLoop();
      notifyProgress();
    });
    audio.addEventListener("play", () => {
      startProgressLoop();
      notifyProgress();
    });
  }
  return audio;
}

export function subscribePreview(fn: PlayListener): () => void {
  playListeners.add(fn);
  fn(playingSrc, playingId);
  return () => {
    playListeners.delete(fn);
  };
}

export function subscribePreviewEnded(fn: EndedListener): () => void {
  endedListeners.add(fn);
  return () => {
    endedListeners.delete(fn);
  };
}

export function subscribePlayer(fn: ProgressListener): () => void {
  progressListeners.add(fn);
  fn(snapshot());
  return () => {
    progressListeners.delete(fn);
  };
}

export function getPlayingSrc(): string | null {
  return playingSrc;
}

export function getPlayingId(): string | null {
  return playingId;
}

export function getPlayerSnapshot(): PlayerSnapshot {
  return snapshot();
}

export function setPlayQueue(tracks: QueueTrack[], startIndex = 0): void {
  queue = tracks.filter((t) => t.previewUrl && t.id);
  queueIndex = queue.length
    ? Math.min(Math.max(0, startIndex), queue.length - 1)
    : -1;
  notifyProgress();
}

function applyMeta(t: {
  title?: string;
  artist?: string;
  artworkUrl?: string;
}) {
  if (t.title) metaTitle = t.title;
  if (t.artist) metaArtist = t.artist;
  if (t.artworkUrl !== undefined) metaArt = t.artworkUrl ?? null;
}

async function startSrc(
  src: string,
  trackId: string | null,
  meta?: { title?: string; artist?: string; artworkUrl?: string },
): Promise<boolean> {
  const a = ensure();
  if (!a || !src) return false;

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
  playingId = trackId;
  if (meta) applyMeta(meta);
  notifyPlay();

  if (a.src !== src) a.src = src;
  try {
    await a.play();
    startProgressLoop();
    return true;
  } catch {
    playingSrc = null;
    playingId = null;
    stopProgressLoop();
    notifyPlay();
    return false;
  }
}

export async function playQueueIndex(index: number): Promise<boolean> {
  if (index < 0 || index >= queue.length) return false;
  const t = queue[index];
  queueIndex = index;
  return startSrc(t.previewUrl, t.id, t);
}

/**
 * Toggle: stesso id in play → pause (tiene posizione per lo scrub).
 * Altro → avvia. Meta opzionale per la barra in basso.
 */
export async function playPreview(
  src: string,
  trackId?: string | null,
  meta?: { title?: string; artist?: string; artworkUrl?: string },
): Promise<boolean> {
  const a = ensure();
  if (!a || !src) return false;

  const same =
    trackId && playingId
      ? playingId === trackId && !a.paused
      : playingSrc === src && !a.paused;

  if (same) {
    a.pause();
    notifyPlay();
    return false;
  }

  if (trackId && playingId === trackId && a.paused && playingSrc === src) {
    try {
      await a.play();
      startProgressLoop();
      notifyPlay();
      return true;
    } catch {
      return false;
    }
  }

  if (trackId) {
    const qi = queue.findIndex((t) => t.id === trackId);
    if (qi >= 0) {
      queueIndex = qi;
      return startSrc(src, trackId, queue[qi]);
    }
  }

  return startSrc(src, trackId ?? null, meta);
}

export function togglePause(): boolean {
  const a = audio;
  if (!a || !playingSrc) return false;
  if (a.paused) {
    void a.play();
    startProgressLoop();
    notifyPlay();
    return true;
  }
  a.pause();
  notifyPlay();
  return false;
}

export function seekPreview(seconds: number): void {
  const a = audio;
  if (!a || !Number.isFinite(seconds)) return;
  const dur = Number.isFinite(a.duration) ? a.duration : 0;
  const t = Math.max(0, dur ? Math.min(seconds, dur) : Math.max(0, seconds));
  try {
    a.currentTime = t;
  } catch {
    /* ignore */
  }
  notifyProgress();
}

export function scrubBy(deltaSec: number): void {
  const a = audio;
  if (!a) return;
  seekPreview((a.currentTime || 0) + deltaSec);
}

export async function playNext(): Promise<boolean> {
  if (queueIndex < 0 || queueIndex >= queue.length - 1) return false;
  return playQueueIndex(queueIndex + 1);
}

export async function playPrev(): Promise<boolean> {
  const a = audio;
  if (a && a.currentTime > 3) {
    seekPreview(0);
    if (a.paused) void a.play();
    return true;
  }
  if (queueIndex <= 0) {
    seekPreview(0);
    return true;
  }
  return playQueueIndex(queueIndex - 1);
}

export function stopPreview(): void {
  const a = audio;
  if (a) {
    a.pause();
    a.currentTime = 0;
  }
  playingSrc = null;
  playingId = null;
  stopProgressLoop();
  notifyPlay();
}

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
