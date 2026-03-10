import { getScenarios } from "@/actions/rating";
import ScenarioGrid from "@/components/gaylyfans/rate/ScenarioGrid";

export const metadata = { title: "Rate Videos — GaylyFans" };

export default async function RatePage() {
  const scenarios = await getScenarios();
  return (
    <div className="min-h-dvh bg-black text-white p-4 pt-16">
      <h1 className="text-2xl font-bold mb-6 text-center">Rate & Compare</h1>
      <p className="text-zinc-400 text-center mb-8">Choose a scenario to rate video variants</p>
      <ScenarioGrid scenarios={scenarios} />
    </div>
  );
}
