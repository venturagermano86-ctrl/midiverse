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
      title="Perché hai queste in wishlist"
      subtitle="Dig List: scegli i dischi, trovi i simili e confronti i prezzi"
      tracks={hits.map((h) => h.track)}
    />
  );
}
