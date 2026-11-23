"use client";

import { TrackRail } from "@/components/TrackRail";
import { useCollection } from "@/components/CollectionProvider";
import { findSimilarToCollection } from "@/lib/engines/similar";

export function HomeCollectionRecs() {
  const { ids, ready } = useCollection();
  if (!ready || ids.length === 0) return null;

  const hits = findSimilarToCollection(ids, 10);
  if (hits.length === 0) return null;

  return (
    <TrackRail
      title="Perché hai queste in collezione"
      subtitle="Stile Diggleist: scegli i dischi, OVUNQUE ti porta i simili"
      tracks={hits.map((h) => h.track)}
    />
  );
}
