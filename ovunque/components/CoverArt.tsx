import { coverStyle } from "@/lib/cover";

type Props = {
  hue: number;
  title: string;
  className?: string;
};

export function CoverArt({ hue, title, className = "" }: Props) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={coverStyle(hue)}
      role="img"
      aria-label={`Cover di ${title}`}
    >
      <div className="absolute inset-0 opacity-30 mix-blend-overlay [background-image:repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.04)_3px)]" />
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full border border-white/20" />
      <div className="absolute bottom-3 left-3 right-3 truncate font-display text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/70">
        {title}
      </div>
    </div>
  );
}
