"use client";

import { ArrowDownNarrowWide, ArrowUpNarrowWide, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData> {
  column: any;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData>) {
  if (!column?.getCanSort()) {
    return <div className={cn("text-sm font-medium", className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();
  const Icon =
    sorted === "asc"
      ? ArrowUpNarrowWide
      : sorted === "desc"
        ? ArrowDownNarrowWide
        : ArrowUpDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8 data-[state=open]:bg-accent", className)}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      <span>{title}</span>
      <Icon className="ml-2 h-4 w-4" />
    </Button>
  );
}

