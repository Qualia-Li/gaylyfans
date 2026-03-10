"use client";

import Link from "next/link";
import { useFeedStore } from "@/stores/feedStore";
import { useState, useEffect, useCallback, useRef } from "react";
import { authClient } from "@/lib/auth/auth-client";
import AuthModal from "./AuthModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function getAnonVisitorId(): string {
  const key = "ggf-visitor-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, id);
  }
  return id;
}

export default function Header() {
  const currentVideoId = useFeedStore((s) => s.currentVideoId);
  const [showAuth, setShowAuth] = useState(false);
  const [starHover, setStarHover] = useState(0);
  const [ratedMap, setRatedMap] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [credits, setCredits] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);
  const visitorIdRef = useRef<string>("");

  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session?.user;
  const email = session?.user?.email ?? null;

  useEffect(() => {
    setStarHover(0);
  }, [currentVideoId]);

  useEffect(() => {
    visitorIdRef.current = getAnonVisitorId();
  }, []);

  const originalVideoId = currentVideoId?.replace(/-\d+$/, "") ?? null;
  const rated = originalVideoId ? (ratedMap[originalVideoId] ?? 0) : 0;

  const handleStarClick = useCallback(async (stars: number) => {
    if (!originalVideoId || submitting) return;
    setRatedMap((m) => ({ ...m, [originalVideoId]: stars }));
    setSubmitting(true);

    try {
      const { submitRating } = await import("@/actions/rating");
      const result = await submitRating({
        scenarioId: originalVideoId,
        visitorId: email || visitorIdRef.current,
        ratingsJson: [{ variantId: originalVideoId, stars }],
        bestVariantId: undefined,
      });
      if (result.isNew) {
        setCredits((c) => c + 1);
        setRatingsCount((r) => r + 1);
      }
    } catch {}
    setSubmitting(false);
  }, [originalVideoId, submitting, email]);

  const handleLogout = async () => {
    await authClient.signOut();
  };

  return (
    <>
      <div className="pointer-events-none fixed top-0 inset-x-0 z-40 px-4 pt-3 pb-2">
        <div className="pointer-events-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-gooey.png" alt="GaylyFans" className="h-12 w-auto drop-shadow-lg" />
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn && (
              <div className="flex gap-2 items-center">
                {ratingsCount > 0 && (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                    ★ {ratingsCount}
                  </Badge>
                )}
                <Badge className="bg-orange-500 text-white px-3 py-1">
                  ⚡ {credits}
                </Badge>
              </div>
            )}

            <div className="flex gap-0.5 drop-shadow-lg" title="Rate this video">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-xl transition-all duration-150 cursor-pointer select-none ${
                    star <= (starHover || rated)
                      ? "text-yellow-400 scale-125"
                      : "text-white/40 hover:text-yellow-300"
                  }`}
                  onMouseEnter={() => setStarHover(star)}
                  onMouseLeave={() => setStarHover(0)}
                  onClick={() => handleStarClick(star)}
                >
                  ★
                </span>
              ))}
            </div>

            <Link href="/generate">
              <Button variant="secondary" size="sm" className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30">
                Generate
              </Button>
            </Link>

            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 max-w-[100px] truncate hidden sm:block">{email}</span>
                <Button variant="ghost" size="sm" className="text-zinc-400" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
                onClick={() => setShowAuth(true)}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
      <AuthModal open={showAuth} onOpenChange={setShowAuth} />
    </>
  );
}
