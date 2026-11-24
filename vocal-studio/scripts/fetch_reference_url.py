#!/usr/bin/env python3
"""Fetch a reference from YouTube / SoundCloud / direct media URL.

1) Try yt-dlp audio (best when the host allows it)
2) Always fetch oEmbed / page title for metadata
3) If no audio file, return meta-only analysis for mood matching

Prints one JSON line to stdout.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

import analyze_reference

YT_HOSTS = (
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "music.youtube.com",
    "www.youtu.be",
)


def normalize_url(raw: str) -> str:
    url = raw.strip()
    if not url:
        raise ValueError("URL vuoto")
    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url
    parsed = urllib.parse.urlparse(url)
    if not parsed.netloc:
        raise ValueError("URL non valido")
    return url


def is_youtube(url: str) -> bool:
    host = urllib.parse.urlparse(url).netloc.lower().removeprefix("www.")
    return host in {h.removeprefix("www.") for h in YT_HOSTS} or host.endswith(
        "youtube.com"
    )


def oembed(url: str) -> dict:
    """Best-effort title/author via oEmbed (works for YT without download)."""
    endpoints = []
    if is_youtube(url):
        endpoints.append(
            "https://www.youtube.com/oembed?format=json&url="
            + urllib.parse.quote(url, safe="")
        )
    endpoints.append(
        "https://soundcloud.com/oembed?format=json&url="
        + urllib.parse.quote(url, safe="")
    )
    for ep in endpoints:
        try:
            with urllib.request.urlopen(ep, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8", errors="replace"))
                return {
                    "title": data.get("title") or "",
                    "author": data.get("author_name") or "",
                    "thumbnail": data.get("thumbnail_url") or "",
                    "provider": data.get("provider_name") or "",
                }
        except Exception:
            continue
    return {"title": "", "author": "", "thumbnail": "", "provider": ""}


def try_ytdlp(url: str, dest_dir: Path) -> Path | None:
    dest_dir.mkdir(parents=True, exist_ok=True)
    outtmpl = str(dest_dir / "ref.%(ext)s")
    env = os.environ.copy()
    env["PATH"] = (
        env.get("PATH", "")
        + os.pathsep
        + str(Path.home() / ".local/bin")
        + os.pathsep
        + str(Path.home() / ".deno/bin")
    )
    cmd = [
        "yt-dlp",
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "5",
        "--no-playlist",
        "--max-downloads",
        "1",
        "--download-sections",
        "*0-90",
        "-o",
        outtmpl,
    ]
    # Prefer deno JS runtime when present
    if (Path.home() / ".deno/bin/deno").exists():
        cmd.extend(["--js-runtimes", "deno"])
    cmd.append(url)
    try:
        subprocess.run(
            cmd,
            check=False,
            capture_output=True,
            text=True,
            timeout=90,
            env=env,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None
    matches = sorted(dest_dir.glob("ref.*"))
    for m in matches:
        if m.suffix.lower() in {".mp3", ".m4a", ".webm", ".opus", ".wav", ".ogg"}:
            return m
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--out-dir", required=True)
    args = ap.parse_args()

    try:
        url = normalize_url(args.url)
    except ValueError as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        return 1

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    meta = oembed(url)
    audio = try_ytdlp(url, out_dir)

    if audio and audio.exists():
        analysis = analyze_reference.analyze(audio)
        analysis["sourceTitle"] = meta.get("title") or analysis.get("sourceTitle", "")
        analysis["sourceAuthor"] = meta.get("author") or ""
        analysis["sourceUrl"] = url
        analysis["sourceMode"] = "audio"
        analysis["note"] = (
            "Mood dall'audio del link — frasi originali, non copia del video."
        )
        print(
            json.dumps(
                {
                    "ok": True,
                    "trackPath": str(audio),
                    "analysis": analysis,
                    "meta": meta,
                }
            )
        )
        return 0

    if not meta.get("title") and is_youtube(url):
        # Last resort: leave empty title so API can still error clearly
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": (
                        "YouTube ha bloccato il download audio da questo server. "
                        "Incolla comunque il link: se oEmbed risponde usiamo il titolo; "
                        "altrimenti carica un file MP3/WAV della traccia."
                    ),
                    "meta": meta,
                }
            )
        )
        return 1

    analysis = analyze_reference.analyze_from_meta(
        title=meta.get("title") or "",
        author=meta.get("author") or "",
        url=url,
    )
    print(
        json.dumps(
            {
                "ok": True,
                "trackPath": "",
                "analysis": analysis,
                "meta": meta,
                "fallback": "meta",
            }
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
