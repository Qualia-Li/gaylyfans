"use client";

import {
  deleteVideo,
  updateVideo,
  AdminVideo,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Heart, MoreHorizontal, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

// ---- Edit Video Dialog ----
const EditVideoDialog = ({
  open,
  onOpenChange,
  video,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: AdminVideo;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(video.title);
  const [creator, setCreator] = useState(video.creator);
  const [videoUrl, setVideoUrl] = useState(video.videoUrl);
  const [sortOrder, setSortOrder] = useState(video.sortOrder);
  const [tags, setTags] = useState((video.tags as string[]).join(", "));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Video #{video.id}</DialogTitle>
          <DialogDescription>Update video details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-creator">Creator</Label>
            <Input
              id="edit-creator"
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-url">Video URL</Label>
            <Input
              id="edit-url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-sort">Sort Order</Label>
            <Input
              id="edit-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
            <Input
              id="edit-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const res = await updateVideo(video.id, {
                  title,
                  creator,
                  videoUrl,
                  sortOrder,
                  tags: tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                });
                if (res.success) {
                  toast.success("Video updated");
                  onOpenChange(false);
                  router.refresh();
                } else {
                  toast.error("Failed to update video", {
                    description: res.error,
                  });
                }
              });
            }}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---- Delete Video Dialog ----
const DeleteVideoDialog = ({
  open,
  onOpenChange,
  video,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: AdminVideo;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Video</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{video.title}&quot;? This
            action cannot be undone.
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
                const res = await deleteVideo(video.id);
                if (res.success) {
                  toast.success("Video deleted");
                  onOpenChange(false);
                  router.refresh();
                } else {
                  toast.error("Failed to delete video", {
                    description: res.error,
                  });
                }
              });
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---- Actions Cell ----
const ActionsCell = ({ video }: { video: AdminVideo }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const handleToggleActive = () => {
    startTransition(async () => {
      const res = await updateVideo(video.id, { isActive: !video.isActive });
      if (res.success) {
        toast.success(video.isActive ? "Video deactivated" : "Video activated");
        router.refresh();
      } else {
        toast.error("Failed to update video", { description: res.error });
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
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(String(video.id));
              toast.success("Copied to clipboard");
            }}
          >
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenEdit(true)}>
            Edit video
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleActive} disabled={isPending}>
            {video.isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setOpenDelete(true)}
          >
            Delete video
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditVideoDialog
        open={openEdit}
        onOpenChange={setOpenEdit}
        video={video}
      />
      <DeleteVideoDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        video={video}
      />
    </>
  );
};

export const columns: ColumnDef<AdminVideo>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.id}</span>
    ),
  },
  {
    id: "video",
    header: "Video",
    cell: ({ row }) => {
      const url = row.original.videoUrl;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-primary hover:underline max-w-[200px] truncate"
        >
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{url.split("/").pop()}</span>
        </a>
      );
    },
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="text-sm font-medium max-w-[200px] truncate block">
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "creator",
    header: "Creator",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.creator}
      </span>
    ),
  },
  {
    accessorKey: "likes",
    header: "Likes",
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Heart className="h-3 w-3" />
        {row.original.likes}
      </div>
    ),
  },
  {
    id: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = row.original.tags as string[];
      if (!tags || tags.length === 0) {
        return <span className="text-sm text-muted-foreground">-</span>;
      }
      return (
        <div className="flex gap-1 flex-wrap max-w-[200px]">
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 3}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: "Active",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    accessorKey: "sortOrder",
    header: "Sort",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.sortOrder}
      </span>
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
    cell: ({ row }) => <ActionsCell video={row.original} />,
  },
];
