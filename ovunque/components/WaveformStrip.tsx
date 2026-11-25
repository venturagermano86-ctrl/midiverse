type Props = { className?: string };

/** Striscia waveform decorativa stile store DJ. */
export function WaveformStrip({ className = "" }: Props) {
  const bars = Array.from({ length: 64 }, (_, i) => {
    const h = 20 + ((i * 17) % 55) + (i % 3) * 8;
    return h;
  });

  return (
    <div
      className={`flex h-10 items-end gap-[2px] overflow-hidden ${className}`}
      aria-hidden
    >
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[3px] shrink-0 rounded-sm bg-signal/70"
          style={{ height: `${h}%`, opacity: 0.35 + (i % 5) * 0.1 }}
        />
      ))}
    </div>
  );
}
