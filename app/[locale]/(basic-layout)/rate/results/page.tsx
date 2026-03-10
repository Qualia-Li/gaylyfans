import { getResults } from "@/actions/rating";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Star, Trophy } from "lucide-react";

export const metadata = { title: "Rating Results — GaylyFans" };

export default async function ResultsPage() {
  const results = await getResults();

  return (
    <div className="min-h-dvh bg-black text-white p-4 pt-16">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/rate"
          className="text-zinc-400 hover:text-white text-sm mb-4 inline-block"
        >
          &larr; Back to scenarios
        </Link>
        <h1 className="text-2xl font-bold mb-2 text-center">
          Rating Results
        </h1>
        <p className="text-zinc-400 text-center mb-8">
          Aggregated community ratings
        </p>

        {results.length === 0 ? (
          <p className="text-center text-zinc-500">
            No ratings submitted yet.
          </p>
        ) : (
          <div className="space-y-8">
            {results.map((scenario) => {
              const topVariant = scenario.variants.reduce(
                (best, v) => (v.avgStars > best.avgStars ? v : best),
                scenario.variants[0]
              );

              return (
                <Card
                  key={scenario.scenarioId}
                  className="bg-zinc-900 border-zinc-800 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">
                      Scenario: {scenario.scenarioId}
                    </h2>
                    <Badge variant="secondary">
                      {scenario.totalVotes} submission
                      {scenario.totalVotes !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scenario.variants.map((variant) => {
                      const isTop =
                        topVariant && variant.variantId === topVariant.variantId;
                      const bestVotes =
                        scenario.bestVariantVotes[variant.variantId] || 0;

                      return (
                        <div
                          key={variant.variantId}
                          className={`rounded-lg border p-4 space-y-2 ${
                            isTop
                              ? "border-yellow-500 bg-yellow-500/5"
                              : "border-zinc-700 bg-zinc-800/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-300 truncate">
                              {variant.variantId}
                            </span>
                            {isTop && (
                              <Trophy className="w-4 h-4 text-yellow-400" />
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    variant.avgStars >= star
                                      ? "fill-yellow-400 text-yellow-400"
                                      : variant.avgStars >= star - 0.5
                                        ? "fill-yellow-400/50 text-yellow-400"
                                        : "fill-transparent text-zinc-600"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-zinc-400">
                              {variant.avgStars.toFixed(1)}
                            </span>
                          </div>

                          <div className="text-xs text-zinc-500 space-y-0.5">
                            <p>{variant.voteCount} rating{variant.voteCount !== 1 ? "s" : ""}</p>
                            {bestVotes > 0 && (
                              <p className="text-yellow-400/80">
                                {bestVotes} best pick{bestVotes !== 1 ? "s" : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
