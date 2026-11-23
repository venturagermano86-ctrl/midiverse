import { TrackCard } from "@/components/TrackCard";
import type { Track } from "@/lib/types";

type Props = {
  title: string;
  subtitle: string;
  tracks: Track[];
};

export function TrackRail({ title, subtitle, tracks }: Props) {
  if (tracks.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="px-5 md:px-10">
        <h2 className="font-display text-xl font-bold text-mist md:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-mist/50">{subtitle}</p>
      </div>
      <div className="flex gap-4 overflow-x-auto px-5 pb-2 scrollbar-thin md:gap-5 md:px-10">
        {tracks.map((track, i) => (
          <TrackCard key={track.id} track={track} index={i} />
        ))}
      </div>
    </section>
  );
}
