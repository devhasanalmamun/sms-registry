"use client";

import Link from "next/link";
import { DataTable, type ColumnDef } from "@/components/data-table";
import { Stamp } from "@/components/registry";

/**
 * The assessment list.
 *
 * `deadline` and `relative` are pre-formatted on the server: rendering a
 * relative time on the client would read the clock during render, and the
 * deadline must be the institution's clock rather than the viewer's.
 */
export type AssessmentRow = {
  id: string;
  title: string;
  module: string;
  dueAtMs: number;
  deadline: string;
  relative: string;
  closed: boolean;
  submitted: number;
  expected: number;
  late: number;
  awaitingMark: number;
  marked: number;
  withheld: number;
};

const columns: ColumnDef<AssessmentRow, unknown>[] = [
  {
    accessorKey: "title",
    header: "Assessment",
    cell: ({ row }) => (
      <>
        <Link
          href={`/assessments/${row.original.id}`}
          className="font-medium underline decoration-input underline-offset-4 hover:decoration-foreground"
        >
          {row.original.title}
        </Link>
        <span className="block text-xs text-muted-foreground">
          {row.original.module}
        </span>
      </>
    ),
  },
  {
    accessorKey: "dueAtMs",
    header: "Deadline",
    cell: ({ row }) => (
      <>
        <span className="font-mono text-xs">{row.original.deadline}</span>
        <span
          className={`block text-xs ${row.original.closed ? "text-muted-foreground" : "text-amber"}`}
        >
          {row.original.closed
            ? `closed ${row.original.relative}`
            : row.original.relative}
        </span>
      </>
    ),
  },
  {
    accessorKey: "submitted",
    header: "In",
    cell: ({ row }) => (
      <>
        <span className="text-foreground">{row.original.submitted}</span>
        <span className="text-muted-foreground">/{row.original.expected}</span>
      </>
    ),
    meta: { numeric: true },
  },
  {
    accessorKey: "late",
    header: "Late",
    cell: ({ row }) => (
      <span
        className={row.original.late > 0 ? "text-amber" : "text-muted-foreground"}
      >
        {row.original.late || "—"}
      </span>
    ),
    meta: { numeric: true },
  },
  {
    accessorKey: "awaitingMark",
    header: "Unmarked",
    cell: ({ row }) => (
      <span
        className={
          row.original.awaitingMark > 0
            ? "text-foreground"
            : "text-muted-foreground"
        }
      >
        {row.original.awaitingMark || "—"}
      </span>
    ),
    meta: { numeric: true },
  },
  {
    accessorKey: "withheld",
    header: "Results",
    cell: ({ row }) =>
      row.original.marked === 0 ? (
        <span className="text-xs text-muted-foreground">Not marked</span>
      ) : row.original.withheld > 0 ? (
        <Stamp tone="seal">{row.original.withheld} withheld</Stamp>
      ) : (
        <Stamp tone="sage">All published</Stamp>
      ),
  },
];

export function AssessmentsTable({ rows }: { rows: AssessmentRow[] }) {
  return <DataTable columns={columns} data={rows} caption="Assessments" />;
}
