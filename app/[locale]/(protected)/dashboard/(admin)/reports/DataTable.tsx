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

import { getAdminReports, AdminReport } from "@/actions/admin/gaylyfans";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  initialData: TData[];
  initialPageCount: number;
  pageSize: number;
}

export function DataTable<TData, TValue>({
  columns,
  initialData,
  initialPageCount,
  pageSize,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [reviewedFilter, setReviewedFilter] = useState<string>("pending");
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
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [reviewedFilter]);

  useEffect(() => {
    // Skip initial fetch if showing default pending filter with initial data
    if (
      pagination.pageIndex === 0 &&
      reviewedFilter === "pending" &&
      data === initialData
    ) {
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const reviewed =
          reviewedFilter === "all"
            ? undefined
            : reviewedFilter === "reviewed"
              ? true
              : false;

        const result = await getAdminReports({
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          reviewed,
        });
        if (result.success && result.data) {
          setData(result.data.reports as TData[]);
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
  }, [reviewedFilter, pagination.pageIndex, pagination.pageSize, initialData]);

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
      <div className="flex items-center gap-4 py-4">
        <Select value={reviewedFilter} onValueChange={setReviewedFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reports</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
          </SelectContent>
        </Select>
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
