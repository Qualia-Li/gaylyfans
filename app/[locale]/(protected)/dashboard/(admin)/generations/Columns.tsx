"use client";

import { AdminGeneration } from "@/actions/admin/gaylyfans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

const statusVariants: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  processing: "secondary",
  completed: "default",
  failed: "destructive",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export const columns: ColumnDef<AdminGeneration>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="text-sm text-muted-foreground cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(row.original.id);
                toast.success("Copied to clipboard");
              }}
            >
              {row.original.id.slice(0, 8)}...
            </span>
          </TooltipTrigger>
          <TooltipContent>{row.original.id}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },
  {
    accessorKey: "userId",
    header: "User ID",
    cell: ({ row }) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="text-sm text-muted-foreground cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(row.original.userId);
                toast.success("Copied to clipboard");
              }}
            >
              {row.original.userId.slice(0, 8)}...
            </span>
          </TooltipTrigger>
          <TooltipContent>{row.original.userId}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant="outline" className={statusColors[status] || ""}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "prompt",
    header: "Prompt",
    cell: ({ row }) => {
      const prompt = row.original.prompt;
      if (!prompt) {
        return <span className="text-sm text-muted-foreground">-</span>;
      }
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm max-w-[200px] truncate block cursor-default">
                {prompt}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-md break-all">
              <p>{prompt}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "creditsCharged",
    header: "Credits",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.creditsCharged}
      </span>
    ),
  },
  {
    id: "result",
    header: "Result",
    cell: ({ row }) => {
      const url = row.original.resultVideoUrl;
      if (!url) {
        const error = row.original.errorMessage;
        if (error) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-destructive max-w-[120px] truncate block cursor-default">
                    Error
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-md break-all">
                  <p>{error}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return <span className="text-sm text-muted-foreground">-</span>;
      }
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          View
        </a>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) =>
      dayjs(row.original.createdAt).format("YYYY-MM-DD HH:mm"),
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.duration ? `${row.original.duration}s` : "-"}
      </span>
    ),
  },
];
