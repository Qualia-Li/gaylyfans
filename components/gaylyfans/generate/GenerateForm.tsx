"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth-client";
import { createGeneration } from "@/actions/generate";
import GenerationStatus from "./GenerationStatus";
import { cn } from "@/lib/utils";
import { CheckCircle, ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";

interface LoraPreset {
  id: string;
  name: string;
  description: string | null;
}

interface GenerateFormProps {
  presets: LoraPreset[];
}

export default function GenerateForm({ presets }: GenerateFormProps) {
  const { data: session } = authClient.useSession();

  // Step 1: URL extraction
  const [tweetUrl, setTweetUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractedImages, setExtractedImages] = useState<string[]>([]);

  // Step 2: Image selection
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Step 3: Generation options
  const [prompt, setPrompt] = useState("");
  const [presetId, setPresetId] = useState<string>("");
  const [duration, setDuration] = useState<number>(5);
  const [generating, setGenerating] = useState(false);

  // Result
  const [jobId, setJobId] = useState<string | null>(null);

  const currentStep =
    jobId ? 4 : selectedImage ? 3 : extractedImages.length > 0 ? 2 : 1;

  const handleExtract = async () => {
    if (!tweetUrl.trim()) {
      toast.error("Please paste a tweet URL.");
      return;
    }

    setExtracting(true);
    setExtractedImages([]);
    setSelectedImage(null);

    try {
      // Call a simple extraction endpoint that grabs images from tweet
      const res = await fetch(
        `/api/extract-images?url=${encodeURIComponent(tweetUrl.trim())}`
      );
      const data = await res.json();

      if (!res.ok || !data.images?.length) {
        toast.error(data.error || "No images found in this tweet.");
        return;
      }

      setExtractedImages(data.images);
      toast.success(`Found ${data.images.length} image(s)!`);
    } catch {
      toast.error("Failed to extract images. Check the URL and try again.");
    } finally {
      setExtracting(false);
    }
  };

  const handleGenerate = async () => {
    if (!session?.user) {
      toast.error("Please sign in to generate videos.");
      return;
    }
    if (!selectedImage) {
      toast.error("Please select a source image.");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Please write a prompt.");
      return;
    }

    setGenerating(true);

    try {
      const result = await createGeneration(
        session.user.id,
        prompt.trim(),
        selectedImage,
        presetId || undefined,
        duration
      );

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      if ("jobId" in result && result.jobId) {
        setJobId(result.jobId);
        toast.success("Generation started!");
      }
    } catch {
      toast.error("Failed to start generation.");
    } finally {
      setGenerating(false);
    }
  };

  const stepIndicator = (step: number, label: string) => (
    <div className="flex items-center gap-2 mb-4">
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold",
          currentStep > step
            ? "bg-green-600 text-white"
            : currentStep === step
              ? "bg-pink-600 text-white"
              : "bg-zinc-800 text-zinc-500"
        )}
      >
        {currentStep > step ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          step
        )}
      </div>
      <span
        className={cn(
          "font-semibold",
          currentStep >= step ? "text-white" : "text-zinc-500"
        )}
      >
        {label}
      </span>
    </div>
  );

  if (!session?.user) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 p-8 text-center">
        <p className="text-zinc-400 mb-4">
          You need to sign in to generate videos.
        </p>
        <Button
          className="bg-pink-600 hover:bg-pink-700"
          onClick={() =>
            toast.info("Please use the sign-in button in the header.")
          }
        >
          Sign In Required
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Extract images from tweet */}
      <Card className="bg-zinc-900 border-zinc-800 p-6">
        {stepIndicator(1, "Paste X/Twitter URL")}
        <div className="flex gap-3">
          <Input
            placeholder="https://x.com/user/status/..."
            value={tweetUrl}
            onChange={(e) => setTweetUrl(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            disabled={extracting}
          />
          <Button
            onClick={handleExtract}
            disabled={extracting || !tweetUrl.trim()}
            className="bg-pink-600 hover:bg-pink-700 shrink-0"
          >
            {extracting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting...
              </>
            ) : (
              "Extract"
            )}
          </Button>
        </div>
      </Card>

      {/* Step 2: Select image */}
      {extractedImages.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          {stepIndicator(2, "Select Source Image")}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {extractedImages.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedImage(img)}
                className={cn(
                  "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                  selectedImage === img
                    ? "border-pink-500 ring-2 ring-pink-500/30"
                    : "border-zinc-700 hover:border-zinc-500"
                )}
              >
                <Image
                  src={img}
                  alt={`Extracted image ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 200px"
                />
                {selectedImage === img && (
                  <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-pink-400" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Or paste direct URL */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="text-sm text-zinc-500 mb-2">
              Or paste an image URL directly:
            </p>
            <Input
              placeholder="https://example.com/image.jpg"
              value={selectedImage ?? ""}
              onChange={(e) => setSelectedImage(e.target.value || null)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
        </Card>
      )}

      {/* Step 3: Prompt + options */}
      {selectedImage && (
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          {stepIndicator(3, "Configure Generation")}

          {/* Selected image preview */}
          <div className="mb-4">
            <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700">
              {selectedImage.startsWith("http") ? (
                <Image
                  src={selectedImage}
                  alt="Selected source"
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="w-8 h-8 text-zinc-600" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Prompt */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Prompt
              </label>
              <Textarea
                placeholder="Describe the video you want to generate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
              />
            </div>

            {/* LoRA preset */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Style Preset (Optional)
              </label>
              <Select value={presetId} onValueChange={setPresetId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="No preset (default)" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="none" className="text-white">
                    No preset (default)
                  </SelectItem>
                  {presets.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      className="text-white"
                    >
                      <span>{p.name}</span>
                      {p.description && (
                        <span className="text-zinc-400 text-xs ml-2">
                          — {p.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Duration
              </label>
              <div className="flex gap-3">
                {[5, 8].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={duration === d ? "default" : "outline"}
                    onClick={() => setDuration(d)}
                    className={cn(
                      "flex-1",
                      duration === d
                        ? "bg-pink-600 hover:bg-pink-700 text-white"
                        : "border-zinc-700 text-zinc-300 hover:text-white"
                    )}
                  >
                    {d}s
                  </Button>
                ))}
              </div>
            </div>

            {/* Cost info */}
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Badge variant="secondary">3 credits</Badge>
              <span>will be charged for this generation</span>
            </div>

            {/* Generate button */}
            <Button
              size="lg"
              className="w-full bg-pink-600 hover:bg-pink-700 text-white"
              disabled={generating || !prompt.trim()}
              onClick={handleGenerate}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting generation...
                </>
              ) : (
                "Generate Video"
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Status + result */}
      {jobId && (
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Generation Progress
          </h2>
          <GenerationStatus jobId={jobId} />
        </Card>
      )}
    </div>
  );
}
