import { getLoraPresets } from "@/actions/generate";
import GenerateForm from "@/components/gaylyfans/generate/GenerateForm";

export const metadata = { title: "Generate Video — GaylyFans" };

export default async function GeneratePage() {
  const presets = await getLoraPresets();

  return (
    <div className="min-h-dvh bg-black text-white p-4 pt-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-center">
          Generate Video
        </h1>
        <p className="text-zinc-400 text-center mb-8">
          Create AI-generated videos from images
        </p>
        <GenerateForm presets={presets} />
      </div>
    </div>
  );
}
