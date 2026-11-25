"use client";

import { useEffect, useRef } from "react";
import { bindNativeAudio } from "@/lib/previewAudio";

type Props = {
  src: string;
  className?: string;
};

/** <audio controls> che ferma QuickPlay / altri audio quando parte. */
export function ExclusiveAudio({ src, className = "" }: Props) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => bindNativeAudio(ref.current), [src]);

  return (
    <audio ref={ref} controls className={className} src={src} preload="none">
      Preview
    </audio>
  );
}
