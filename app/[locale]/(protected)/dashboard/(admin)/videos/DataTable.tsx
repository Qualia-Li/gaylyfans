"use client";

import {
  ColumnDef,
  ColumnPinningState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

import {
  createVideo,
  getAdminVideos,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  initialData: TData[];
  initialPageCount: number;
  pageSize: number;
}

function AddVideoDialog() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [tags, setTags] = useState("");

  const handleCreate = () => {
    if (!title || !creator || !videoUrl) {
      toast.error("Please fill in all required fields");
      return;
    }
    startTransition(async () => {
      const res = await createVideo({
        title,
        creator,
        videoUrl,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      if (res.success) {
        toast.success("Video created");
        setOpen(false);
        setTitle("");
        setCreator("");
        setVideoUrl("");
        setTags("");
        router.refresh();
      } else {
        toast.error("Failed to create video", { description: res.error });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Video
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Video</DialogTitle>
          <DialogDescription>
            Add a new video to the feed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-url">Video URL *</Label>
            <Input
              id="new-url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-title">Title *</Label>
            <Input
              id="new-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-creator">Creator *</Label>
            <Input
              id="new-creator"
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              placeholder="Creator name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-tags">Tags (comma-separated)</Label>
            <Input
              id="new-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isPending}>
            {isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DataTable<TData, TValue>({
  columns,
  initialData,
  initialPageCount,
  pageSize,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [debouncedGlobalFilter] = useDebounce(globalFilter, 500);
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["actions"],
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  });
  const [data, setData] = useState<TData[]>(initialData);
  const [pageCount, setPageCount] = useState<number>(initialPageCount);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (debouncedGlobalFilter !== undefined) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [debouncedGlobalFilter]);

  useEffect(() => {
    if (
      pagination.pageIndex === 0 &&
      !debouncedGlobalFilter &&
      data === initialData
    ) {
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await getAdminVideos({
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          filter: debouncedGlobalFilter,
        });
        if (result.success && result.data) {
          setData(result.data.videos as TData[]);
          setPageCount(
            Math.ceil(result.data.totalCount / pagination.pageSize)
          );
        }
      } catch (error: any) {
        toast.error("Failed to fetch data", {
          description: error.message,
        });
        setData([]);
        setPageCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    debouncedGlobalFilter,
    pagination.pageIndex,
    pagination.pageSize,
    initialData,
  ]);

  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount,
    state: {
      sorting,
      pagination,
      columnPinning,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnPinningChange: setColumnPinning,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
  });

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Search by title, creator..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        <AddVideoDialog />
      </div>
      <div className="relative min-h-[200px] max-h-[calc(100vh-200px)] overflow-auto rounded-md border">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.getSize(),
                        minWidth: header.column.columnDef.minSize,
                        maxWidth: header.column.columnDef.maxSize,
                        position: header.column.getIsPinned()
                          ? "sticky"
                          : "relative",
                        left:
                          header.column.getIsPinned() === "left"
                            ? `${header.column.getStart("left")}px`
                            : undefined,
                        right:
                          header.column.getIsPinned() === "right"
                            ? `${header.column.getAfter("right")}px`
                            : undefined,
                        zIndex: header.column.getIsPinned() ? 20 : 1,
                        backgroundColor: "var(--background)",
                        boxShadow:
                          header.column.getIsPinned() === "left" &&
                          header.column.getIsLastColumn("left")
                            ? "2px 0 4px -2px rgba(0, 0, 0, 0.1)"
                            : header.column.getIsPinned() === "right" &&
                                header.column.getIsFirstColumn("right")
                              ? "-2px 0 4px -2px rgba(0, 0, 0, 0.1)"
                              : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        width: cell.column.getSize(),
                        minWidth: cell.column.columnDef.minSize,
                        maxWidth: cell.column.columnDef.maxSize,
                        position: cell.column.getIsPinned()
                          ? "sticky"
                          : "relative",
                        left:
                          cell.column.getIsPinned() === "left"
                            ? `${cell.column.getStart("left")}px`
                            : undefined,
                        right:
                          cell.column.getIsPinned() === "right"
                            ? `${cell.column.getAfter("right")}px`
                            : undefined,
                        zIndex: cell.column.getIsPinned() ? 20 : 1,
                        backgroundColor: "var(--background)",
                        boxShadow:
                          cell.column.getIsPinned() === "left" &&
                          cell.column.getIsLastColumn("left")
                            ? "2px 0 4px -2px rgba(0, 0, 0, 0.1)"
                            : cell.column.getIsPinned() === "right" &&
                                cell.column.getIsFirstColumn("right")
                              ? "-2px 0 4px -2px rgba(0, 0, 0, 0.1)"
                              : undefined,
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {isLoading ? "" : "No results."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
