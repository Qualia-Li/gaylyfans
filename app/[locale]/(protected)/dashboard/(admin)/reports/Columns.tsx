"use client";

import {
  dismissReport,
  markReportReviewed,
  AdminReport,
} from "@/actions/admin/gaylyfans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { CheckCircle, MoreHorizontal, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const reasonColors: Record<string, string> = {
  not_interested: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  low_quality: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  rights_violation: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  child_content: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  other: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

const reasonLabels: Record<string, string> = {
  not_interested: "Not Interested",
  low_quality: "Low Quality",
  rights_violation: "Rights Violation",
  child_content: "Child Content",
  other: "Other",
};

// ---- Dismiss Report Dialog ----
const DismissDialog = ({
  open,
  onOpenChange,
  report,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: AdminReport;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dismiss Report</DialogTitle>
          <DialogDescription>
            Are you sure you want to dismiss this report? It will be permanently
            deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const res = await dismissReport(report.id);
                if (res.success) {
                  toast.success("Report dismissed");
                  onOpenChange(false);
                  router.refresh();
                } else {
                  toast.error("Failed to dismiss report", {
                    description: res.error,
                  });
                }
              });
            }}
          >
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---- Actions Cell ----
const ActionsCell = ({ report }: { report: AdminReport }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openDismiss, setOpenDismiss] = useState(false);

  const handleMarkReviewed = () => {
    startTransition(async () => {
      const res = await markReportReviewed(report.id);
      if (res.success) {
        toast.success("Report marked as reviewed");
        router.refresh();
      } else {
        toast.error("Failed to update report", { description: res.error });
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {!report.reviewed && (
            <DropdownMenuItem
              onClick={handleMarkReviewed}
              disabled={isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Reviewed
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => {
              window.open(`/feed?v=${report.videoId}`, "_blank");
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Video
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setOpenDismiss(true)}
          >
            Dismiss Report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DismissDialog
        open={openDismiss}
        onOpenChange={setOpenDismiss}
        report={report}
      />
    </>
  );
};

export const columns: ColumnDef<AdminReport>[] = [
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
    id: "video",
    header: "Video",
    cell: ({ row }) => (
      <span className="text-sm max-w-[150px] truncate block">
        {row.original.videoTitle || `Video #${row.original.videoId}`}
      </span>
    ),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => {
      const reason = row.original.reason;
      return (
        <Badge
          variant="outline"
          className={reasonColors[reason] || ""}
        >
          {reasonLabels[reason] || reason}
        </Badge>
      );
    },
  },
  {
    accessorKey: "detail",
    header: "Detail",
    cell: ({ row }) => {
      const detail = row.original.detail;
      if (!detail) {
        return <span className="text-sm text-muted-foreground">-</span>;
      }
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm max-w-[200px] truncate block cursor-default">
                {detail}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-md break-all">
              <p>{detail}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "userAgent",
    header: "User Agent",
    cell: ({ row }) => {
      const ua = row.original.userAgent;
      if (!ua) {
        return <span className="text-sm text-muted-foreground">-</span>;
      }
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm max-w-[120px] truncate block cursor-default">
                {ua}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-md break-all">
              <p>{ua}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "reviewed",
    header: "Reviewed",
    cell: ({ row }) => (
      <Badge variant={row.original.reviewed ? "default" : "destructive"}>
        {row.original.reviewed ? "Reviewed" : "Pending"}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) =>
      dayjs(row.original.createdAt).format("YYYY-MM-DD HH:mm"),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ActionsCell report={row.original} />,
  },
];
