"use client";

import { useEffect, useState, useCallback } from "react";
import { getGenerationStatus } from "@/actions/generate";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Loader2, Download } from "lucide-react";

interface StatusData {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  resultVideoUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    progress: 10,
    icon: Loader2,
  },
  processing: {
    label: "Processing",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    progress: 50,
    icon: Loader2,
  },
  completed: {
    label: "Completed",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    progress: 100,
    icon: CheckCircle,
  },
  failed: {
    label: "Failed",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    progress: 100,
    icon: XCircle,
  },
} as const;

export default function GenerationStatus({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const result = await getGenerationStatus(jobId);
      if ("error" in result && result.error) {
        setError(result.error);
        return false; // stop polling
      }
      setStatus(result as StatusData);
      // Keep polling if not terminal
      return (
        result.status === "pending" || result.status === "processing"
      );
    } catch {
      setError("Failed to fetch status.");
      return false;
    }
  }, [jobId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let mounted = true;

    const tick = async () => {
      const shouldContinue = await poll();
      if (mounted && shouldContinue) {
        timer = setTimeout(tick, 3000);
      }
    };

    tick();

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [poll]);

  if (error) {
    return (
      <div className="text-center text-red-400">
        <XCircle className="w-8 h-8 mx-auto mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center gap-2 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading status...</span>
      </div>
    );
  }

  const config = STATUS_CONFIG[status.status];
  const Icon = config.icon;
  const isAnimated = status.status === "pending" || status.status === "processing";

  return (
    <div className="space-y-4">
      {/* Status badge + progress */}
      <div className="flex items-center gap-3">
        <Icon
          className={cn(
            "w-5 h-5",
            isAnimated && "animate-spin",
            status.status === "completed" && "text-green-400",
            status.status === "failed" && "text-red-400"
          )}
        />
        <Badge className={config.color}>{config.label}</Badge>
      </div>

      <Progress
        value={config.progress}
        className="h-2 bg-zinc-800"
      />

      {/* Elapsed time */}
      {isAnimated && (
        <p className="text-sm text-zinc-500">
          Polling for updates every 3 seconds...
        </p>
      )}

      {/* Error message */}
      {status.status === "failed" && status.errorMessage && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">
          {status.errorMessage}
        </div>
      )}

      {/* Result video */}
      {status.status === "completed" && status.resultVideoUrl && (
        <div className="space-y-3">
          <div className="rounded-lg overflow-hidden bg-black border border-zinc-800">
            <video
              src={status.resultVideoUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full"
            />
          </div>
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:text-white"
            asChild
          >
            <a
              href={status.resultVideoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Video
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
