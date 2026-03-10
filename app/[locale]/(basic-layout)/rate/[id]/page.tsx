import { getScenario } from "@/actions/rating";
import VideoComparison from "@/components/gaylyfans/rate/VideoComparison";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scenario = await getScenario(id);
  return {
    title: scenario ? `Rate: ${scenario.name} — GaylyFans` : "Not Found",
  };
}

export default async function RateScenarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scenario = await getScenario(id);

  if (!scenario) {
    notFound();
  }

  return (
    <div className="min-h-dvh bg-black text-white p-4 pt-16">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/rate"
          className="text-zinc-400 hover:text-white text-sm mb-4 inline-block"
        >
          &larr; Back to scenarios
        </Link>
        <h1 className="text-2xl font-bold mb-2">{scenario.name}</h1>
        <p className="text-zinc-400 mb-8">
          Rate each variant and pick your favourite
        </p>
        <VideoComparison scenario={scenario} />
      </div>
    </div>
  );
}
