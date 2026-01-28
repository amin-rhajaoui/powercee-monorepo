"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Client } from "@/lib/api/clients";

type DataTableProps = {
  columns: ColumnDef<Client>[];
  data: Client[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  isLoading?: boolean;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <TableRow className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className={cn("h-4", i === 0 ? "w-32" : "w-20")} />
        </TableCell>
      ))}
    </TableRow>
  );
}

export function DataTable({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sorting,
  onSortingChange,
  isLoading,
}: DataTableProps) {
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination: { pageIndex: page - 1, pageSize },
    },
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    onPaginationChange: (updater) => {
      const value =
        typeof updater === "function"
          ? updater({ pageIndex: page - 1, pageSize })
          : updater;
      onPageChange(value.pageIndex + 1);
      onPageSizeChange(value.pageSize);
    },
    manualSorting: true,
    onSortingChange: (updater) => {
      if (typeof updater === "function") {
        onSortingChange(updater(sorting));
      } else {
        onSortingChange(updater);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const safeTotal = total ?? data.length;
  const from =
    safeTotal === 0 ? 0 : Math.min((page - 1) * pageSize + 1, safeTotal);
  const to = safeTotal === 0 ? 0 : Math.min(page * pageSize, safeTotal);
  const totalPages = Math.max(1, Math.ceil(safeTotal / pageSize));

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="font-semibold">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // Skeleton loading state
            Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={columns.length} />
            ))
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, index) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="animate-fade-in transition-colors"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            // Empty state
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-48 text-center"
              >
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground animate-fade-in">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Users className="h-8 w-8" />
                  </div>
                  <p className="font-medium text-foreground">Aucun client trouve</p>
                  <p className="text-sm mt-1">
                    Ajoutez votre premier client pour commencer
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex flex-col gap-4 p-4 border-t bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {safeTotal > 0 ? (
            <>
              Affichage <span className="font-medium text-foreground">{from}</span> -{" "}
              <span className="font-medium text-foreground">{to}</span> sur{" "}
              <span className="font-medium text-foreground">{safeTotal}</span>
            </>
          ) : (
            "Aucun resultat"
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Par page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Page precedente</span>
            </Button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm font-medium">{page}</span>
              <span className="text-sm text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground">{totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Page suivante</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

