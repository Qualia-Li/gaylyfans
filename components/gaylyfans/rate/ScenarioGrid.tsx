"use client";

import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScenarioRow {
  id: string;
  name: string;
  sourceImageUrl: string | null;
  variantCount: number;
}

export default function ScenarioGrid({
  scenarios,
}: {
  scenarios: ScenarioRow[];
}) {
  if (scenarios.length === 0) {
    return (
      <p className="text-center text-zinc-500">No scenarios available yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {scenarios.map((s) => (
        <Link key={s.id} href={`/rate/${s.id}`}>
          <Card className="overflow-hidden bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer group">
            <div className="relative aspect-video bg-zinc-800">
              {s.sourceImageUrl ? (
                <Image
                  src={s.sourceImageUrl}
                  alt={s.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                  No preview
                </div>
              )}
            </div>
            <div className="p-4 flex items-center justify-between">
              <h2 className="font-semibold text-white truncate">{s.name}</h2>
              <Badge variant="secondary" className="ml-2 shrink-0">
                {s.variantCount} variant{s.variantCount !== 1 ? "s" : ""}
              </Badge>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
