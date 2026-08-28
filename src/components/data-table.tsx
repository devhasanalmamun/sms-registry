"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * The Registry's data table: TanStack Table driving shadcn's Table primitives,
 * as shadcn's own data-table pattern does.
 *
 * Why a table library at all, when the rows are already sorted by the database:
 * Registry staff re-sort constantly, and always by the column in front of them —
 * "who owes the most", "what is due first", "which marks are outstanding". Doing
 * that in the URL would mean a round trip per click on lists that are small
 * enough to hold in the page, so sorting is client-side and the server query
 * stays responsible for *which* rows are in the list.
 *
 * Column meta carries the two things this design needs and TanStack has no
 * opinion about: whether a column is numeric (right-aligned, tabular figures)
 * and how tall its rows sit.
 */

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    numeric?: boolean;
    /** Extra classes for both the header cell and the body cells. */
    cellClassName?: string;
  }
}

export type { ColumnDef };

export function DataTable<TData>({
  columns,
  data,
  initialSorting = [],
  minWidth = "42rem",
  rowClassName,
  alignTop = false,
  caption,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  initialSorting?: SortingState;
  /** The table scrolls sideways below this; it never squeezes a name onto two lines. */
  minWidth?: string;
  rowClassName?: (row: TData) => string | undefined;
  alignTop?: boolean;
  caption?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  // The React Compiler declines to memoize this component, because
  // `useReactTable` hands back functions it cannot prove are stable. That is
  // the intended behaviour rather than a defect: TanStack does its own
  // memoization internally, and these lists are tens of rows, not thousands.
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Table style={{ minWidth }}>
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map((header) => {
              const meta = header.column.columnDef.meta;
              const sortable = header.column.getCanSort();
              const sorted = header.column.getIsSorted();

              const label = header.isPlaceholder
                ? null
                : flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  );

              return (
                <TableHead
                  key={header.id}
                  aria-sort={
                    sorted === "asc"
                      ? "ascending"
                      : sorted === "desc"
                        ? "descending"
                        : sortable
                          ? "none"
                          : undefined
                  }
                  className={cn(
                    "h-auto px-4 py-2 font-mono text-[0.625rem] font-medium uppercase tracking-[0.13em] text-muted-foreground",
                    meta?.numeric ? "text-right" : "text-left",
                    sortable && "p-0",
                    meta?.cellClassName,
                  )}
                >
                  {sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        "h-auto w-full rounded-none px-4 py-2 font-mono text-[0.625rem] font-medium uppercase tracking-[0.13em] text-muted-foreground",
                        meta?.numeric ? "justify-end" : "justify-start",
                      )}
                    >
                      {label}
                      {sorted === "asc" ? (
                        <ArrowUp aria-hidden />
                      ) : sorted === "desc" ? (
                        <ArrowDown aria-hidden />
                      ) : (
                        <ChevronsUpDown className="opacity-40" aria-hidden />
                      )}
                    </Button>
                  ) : (
                    label
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>

      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            className={cn(alignTop && "align-top", rowClassName?.(row.original))}
          >
            {row.getVisibleCells().map((cell) => {
              const meta = cell.column.columnDef.meta;
              return (
                <TableCell
                  key={cell.id}
                  className={cn(
                    "px-4 py-2.5 align-middle",
                    alignTop && "align-top",
                    meta?.numeric && "text-right font-mono",
                    meta?.cellClassName,
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
