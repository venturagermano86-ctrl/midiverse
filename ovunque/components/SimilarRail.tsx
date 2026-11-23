import { TrackCard } from "@/components/TrackCard";
import type { SimilarHit } from "@/lib/engines/similar";

type Props = {
  title: string;
  subtitle: string;
  hits: SimilarHit[];
};

export function SimilarRail({ title, subtitle, hits }: Props) {
  if (hits.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-mist md:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-mist/50">{subtitle}</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 md:gap-5">
        {hits.map((hit, i) => (
          <div key={hit.track.id}>
            <TrackCard track={hit.track} index={i} />
            <p className="mt-1 max-w-[13rem] line-clamp-2 text-[0.65rem] leading-snug text-mist/40">
              {hit.reasons.join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
