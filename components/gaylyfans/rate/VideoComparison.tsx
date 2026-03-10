"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import StarRating from "./StarRating";
import { useRatingStore } from "@/stores/ratingStore";
import { submitRating } from "@/actions/rating";
import { authClient } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface Variant {
  id: string;
  label: string;
  videoUrl: string;
}

interface ScenarioData {
  id: string;
  name: string;
  sourceImageUrl: string | null;
  variants: Variant[];
}

function getAnonVisitorId(): string {
  const key = "ggf-visitor-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, id);
  }
  return id;
}

export default function VideoComparison({
  scenario,
}: {
  scenario: ScenarioData;
}) {
  const {
    ratings,
    bestVariantId,
    submitted,
    setRating,
    setBest,
    setSubmitted,
    reset,
  } = useRatingStore();

  const [submitting, setSubmitting] = useState(false);
  const visitorIdRef = useRef<string>("");
  const { data: session } = authClient.useSession();

  useEffect(() => {
    reset();
    visitorIdRef.current = getAnonVisitorId();
  }, [scenario.id, reset]);

  const allRated = scenario.variants.every((v) => ratings[v.id] && ratings[v.id] > 0);

  const handleSubmit = async () => {
    if (!allRated || submitting) return;
    setSubmitting(true);

    try {
      const ratingsArr = scenario.variants.map((v) => ({
        variantId: v.id,
        stars: ratings[v.id] || 0,
      }));

      const result = await submitRating({
        scenarioId: scenario.id,
        visitorId: session?.user?.email || visitorIdRef.current,
        userId: session?.user?.id,
        ratingsJson: ratingsArr,
        bestVariantId: bestVariantId ?? undefined,
      });

      if (result.ok) {
        setSubmitted(true);
        if (result.isNew) {
          toast.success("Rating submitted! You earned 1 credit.", {
            description: "Thanks for your feedback!",
          });
        } else {
          toast.success("Rating updated!", {
            description: "Your previous rating has been overwritten.",
          });
        }
      }
    } catch {
      toast.error("Failed to submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Source image */}
      {scenario.sourceImageUrl && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-300">Source Image</h2>
          <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden bg-zinc-900">
            <Image
              src={scenario.sourceImageUrl}
              alt="Source"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 448px"
            />
          </div>
        </div>
      )}

      {/* Variants grid */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-300">Video Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {scenario.variants.map((variant) => {
            const isBest = bestVariantId === variant.id;

            return (
              <Card
                key={variant.id}
                className={cn(
                  "bg-zinc-900 border-zinc-800 overflow-hidden",
                  isBest && "border-yellow-500 ring-1 ring-yellow-500/50"
                )}
              >
                {/* Video */}
                <div className="relative aspect-video bg-black">
                  <video
                    src={variant.videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Rating controls */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">
                      {variant.label}
                    </span>
                    {isBest && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        Best Pick
                      </Badge>
                    )}
                  </div>

                  <StarRating
                    value={ratings[variant.id] || 0}
                    onChange={(stars) => setRating(variant.id, stars)}
                    disabled={submitted}
                  />

                  <Button
                    variant={isBest ? "default" : "outline"}
                    size="sm"
                    disabled={submitted}
                    onClick={() => setBest(isBest ? null : variant.id)}
                    className={cn(
                      "w-full",
                      isBest
                        ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                        : "border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500"
                    )}
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    {isBest ? "Best Pick!" : "Pick as Best"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-center pt-4 pb-8">
        {submitted ? (
          <div className="text-center space-y-3">
            <p className="text-green-400 font-semibold text-lg">
              Thanks for rating!
            </p>
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300"
              onClick={() => reset()}
            >
              Rate Again
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            disabled={!allRated || submitting}
            onClick={handleSubmit}
            className="bg-pink-600 hover:bg-pink-700 text-white px-8"
          >
            {submitting ? "Submitting..." : "Submit Ratings"}
          </Button>
        )}
      </div>
    </div>
  );
}
