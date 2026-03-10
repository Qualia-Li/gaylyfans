"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import type { FeedVideo } from "@/types/gaylyfans";
import VideoCard from "./VideoCard";
import ActionBar from "./ActionBar";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const BATCH_SIZE = 8;

export default function Feed({
  initialVideos,
  generatedVideos = [],
}: {
  initialVideos: FeedVideo[];
  generatedVideos?: FeedVideo[];
}) {
  // Merge curated and AI-generated videos into a single pool
  const allVideos = useMemo(() => {
    return [...initialVideos, ...generatedVideos];
  }, [initialVideos, generatedVideos]);

  const [displayVideos, setDisplayVideos] = useState<{ key: string; video: FeedVideo }[]>(() =>
    shuffle(allVideos).slice(0, BATCH_SIZE).map((v, i) => ({ key: `${v.id}-${i}`, video: v }))
  );
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (allVideos.length === 0) return;
    setDisplayVideos((prev) => {
      const next = shuffle(allVideos).slice(0, BATCH_SIZE);
      return [
        ...prev,
        ...next.map((v, i) => ({ key: `${v.id}-${prev.length + i}`, video: v })),
      ];
    });
  }, [allVideos]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200%" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  if (allVideos.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <p className="text-zinc-400">No videos found</p>
      </div>
    );
  }

  return (
    <>
      <div className="snap-container no-scrollbar">
        {displayVideos.map(({ key, video }, i) => (
          <VideoCard key={key} video={video} lazy={i > 1} />
        ))}
        <div ref={sentinelRef} className="h-1" />
      </div>
      <ActionBar videos={allVideos} />
    </>
  );
}
