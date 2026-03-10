"use client";

import { useAgeGate } from "@/stores/ageGateStore";
import AgeGate from "./AgeGate";
import Feed from "./Feed";
import Header from "./Header";
import type { FeedVideo } from "@/types/gaylyfans";

export default function GaylyFansHome({
  initialVideos,
  generatedVideos = [],
}: {
  initialVideos: FeedVideo[];
  generatedVideos?: FeedVideo[];
}) {
  const verified = useAgeGate((s) => s.verified);

  if (!verified) {
    return <AgeGate />;
  }

  return (
    <div className="bg-black min-h-dvh">
      <Header />
      <Feed initialVideos={initialVideos} generatedVideos={generatedVideos} />
    </div>
  );
}
