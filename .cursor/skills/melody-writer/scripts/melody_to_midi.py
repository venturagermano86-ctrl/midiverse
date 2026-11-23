#!/usr/bin/env python3
"""Turn a melody sketch into a MIDI file. No dependencies.

Usage: python melody_to_midi.py melody.txt [out.mid]

melody.txt, one note per line (blank lines and # comments ignored):
    tempo 90
    G4 1.5 hold
    E4 0.5 on
    R 1          (a rest of one beat)
Fields: note (C4 = middle C, sharps as C#4, flats as Eb4) or R, length in beats, optional syllable.
Optional line: meter 3 (beats per bar, default 4).
It also prints where every note starts (bar.beat) and warns when a note crosses a barline,
so you can check the stresses land where you meant before you share the melody.
"""
import struct
import sys

NAMES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def pitch(n):
    base, rest = NAMES[n[0].upper()], n[1:]
    while rest and rest[0] in "#b":
        base += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    return 12 * (int(rest) + 1) + base


def vlq(n):
    out = [n & 0x7F]
    while n > 0x7F:
        n >>= 7
        out.insert(0, (n & 0x7F) | 0x80)
    return bytes(out)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    tpq, tempo, events, wait = 480, 120.0, [], 0
    meter, pos, report = 4.0, 0.0, []
    for line in open(sys.argv[1], encoding="utf-8"):
        line = line.split("#")[0].strip()
        if not line:
            continue
        f = line.split()
        if f[0].lower() == "tempo":
            tempo = float(f[1])
            continue
        if f[0].lower() == "meter":
            meter = float(f[1])
            continue
        beats = float(f[1])
        bar, beat = int(pos // meter) + 1, pos % meter + 1
        cross = " <- crosses the barline" if (pos % meter) + beats > meter + 1e-9 else ""
        report.append(f"{bar}.{beat:g}\t{f[0]}\t{beats:g}\t{' '.join(f[2:])}{cross}")
        pos += beats
        ticks = round(beats * tpq)
        if f[0].upper() == "R":
            wait += ticks
            continue
        p = pitch(f[0])
        events += [vlq(wait) + bytes([0x90, p, 90]), vlq(ticks) + bytes([0x80, p, 0])]
        wait = 0
    us = round(60_000_000 / tempo)
    track = vlq(0) + b"\xff\x51\x03" + us.to_bytes(3, "big") + b"".join(events) + vlq(0) + b"\xff\x2f\x00"
    out = sys.argv[2] if len(sys.argv) > 2 else sys.argv[1].rsplit(".", 1)[0] + ".mid"
    with open(out, "wb") as fh:
        fh.write(b"MThd" + struct.pack(">IHHH", 6, 0, 1, tpq) + b"MTrk" + struct.pack(">I", len(track)) + track)
    print("start\tnote\tbeats\tsyllable")
    print("\n".join(report))
    if pos % meter:
        print(f"note: the melody ends {pos % meter:g} beats into a bar")
    print(f"wrote {out} ({len(events) // 2} notes at {tempo:g} BPM)")


if __name__ == "__main__":
    main()
