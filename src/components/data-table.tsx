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
import type { Tone } from "@/components/registry";
import { cn } from "@/lib/utils";

/**
 * The register, as continuous stationery.
 *
 * TanStack Table drives shadcn's Table primitives, as shadcn's own data-table
 * pattern does. Three things are added on top, and each is doing a job rather
 * than a decoration:
 *
 *  · **Banded rows.** A fee row is eight columns wide and the eye loses its
 *    place halfway across. Greenbar paper solved that in 1965 by printing pale
 *    bands, and it still works.
 *  · **An ink column head.** A printed register's headings sit in a solid bar,
 *    which is also the honest way to say "this row is not data".
 *  · **A margin.** The first column has no heading and is blank on most rows.
 *    A mark appears there only where the row wants something — money past due,
 *    work handed in late, a result still withheld. Scanning the margin is
 *    triage, and a register in good order reads as an empty left edge.
 *
 * Sorting is client-side because Registry staff re-sort constantly, and always
 * by the column in front of them: who owes most, what is due first, which
 * scripts are unmarked. These lists fit in the page, so a round trip per click
 * would be the wrong trade. The server query still decides *which* rows are in
 * the list.
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

const markTones: Record<Tone, string> = {
  neutral: "text-graphite",
  flag: "text-flag",
  watch: "text-watch",
  clear: "text-clear",
  quiet: "text-dim",
};

export function DataTable<TData>({
  columns,
  data,
  initialSorting = [],
  minWidth = "42rem",
  alignTop = false,
  mark,
  caption,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  initialSorting?: SortingState;
  /** The table scrolls sideways below this; it never squeezes a name onto two lines. */
  minWidth?: string;
  alignTop?: boolean;
  /** What, if anything, this row wants of you. Renders the margin mark. */
  mark?: (row: TData) => { tone: Tone; label: string } | null;
  caption?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  // The React Compiler declines to memoize this component, because
  // `useReactTable` hands back functions it cannot prove are stable. That is
  // intended rather than a defect: TanStack memoizes internally, and these
  // lists are tens of rows, not thousands.
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
          <TableRow
            key={headerGroup.id}
            className="border-0 bg-foreground hover:bg-foreground"
          >
            {mark ? (
              <TableHead className="w-7 p-0">
                <span className="sr-only">Needs attention</span>
              </TableHead>
            ) : null}

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
                    "colhead h-auto px-3 py-2 text-background/70",
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
                        "colhead h-auto w-full px-3 py-2 text-background/70",
                        "hover:bg-background/12 hover:text-background",
                        sorted && "text-background",
                        meta?.numeric ? "justify-end" : "justify-start",
                      )}
                    >
                      {label}
                      {sorted === "asc" ? (
                        <ArrowUp aria-hidden />
                      ) : sorted === "desc" ? (
                        <ArrowDown aria-hidden />
                      ) : (
                        <ChevronsUpDown className="opacity-35" aria-hidden />
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
        {table.getRowModel().rows.map((row) => {
          const flagged = mark?.(row.original) ?? null;

          return (
            <TableRow
              key={row.id}
              className={cn(
                "border-0 even:bg-band hover:bg-rule/45",
                alignTop && "align-top",
              )}
            >
              {mark ? (
                <TableCell className="w-7 py-2.5 pl-3 pr-0">
                  {flagged ? (
                    <span
                      className={markTones[flagged.tone]}
                      title={flagged.label}
                    >
                      <span className="margin-mark" />
                      <span className="sr-only">{flagged.label}</span>
                    </span>
                  ) : null}
                </TableCell>
              ) : null}

              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta;
                return (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-3 py-2.5 align-middle",
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
          );
        })}
      </TableBody>
    </Table>
  );
}
