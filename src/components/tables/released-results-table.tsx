"use client";

import { DataTable, type ColumnDef } from "@/components/data-table";
import { Stamp } from "@/components/registry";

/**
 * The student's own marksheet.
 *
 * Only published results reach this component — they are filtered out in the
 * database query rather than hidden here, so an unreleased mark is never in the
 * payload to begin with.
 */
export type ReleasedResultRow = {
  id: string;
  title: string;
  module: string;
  feedback: string | null;
  score: number;
  classification: string;
  passed: boolean;
  released: string;
  releasedMs: number;
};

const columns: ColumnDef<ReleasedResultRow, unknown>[] = [
  {
    accessorKey: "title",
    header: "Assessment",
    cell: ({ row }) => (
      <>
        <span className="font-medium">{row.original.title}</span>
        <span className="block text-xs text-muted-foreground">
          {row.original.module}
        </span>
        {row.original.feedback ? (
          <p className="mt-1.5 max-w-md border-l-2 border-input pl-3 text-sm text-graphite">
            {row.original.feedback}
          </p>
        ) : null}
      </>
    ),
  },
  {
    accessorKey: "score",
    header: "Mark",
    cell: ({ row }) => (
      <span
        className={`text-base ${row.original.passed ? "" : "text-destructive"}`}
      >
        {row.original.score}
      </span>
    ),
    meta: { numeric: true },
  },
  {
    accessorKey: "classification",
    header: "Classification",
    cell: ({ row }) => (
      <Stamp tone={row.original.passed ? "clear" : "flag"}>
        {row.original.classification}
      </Stamp>
    ),
  },
  {
    accessorKey: "releasedMs",
    header: "Released",
    cell: ({ row }) => row.original.released,
    meta: { cellClassName: "font-mono text-xs text-muted-foreground" },
  },
];

export function ReleasedResultsTable({ rows }: { rows: ReleasedResultRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      alignTop
      caption="Released results"
    />
  );
}
