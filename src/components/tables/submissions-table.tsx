"use client";

import Link from "next/link";
import { DataTable, type ColumnDef } from "@/components/data-table";
import { Stamp } from "@/components/registry";

/** Everything one student has handed in, across every assessment. */
export type SubmissionRow = {
  id: string;
  assessmentId: string;
  title: string;
  module: string;
  due: string;
  submitted: string;
  submittedMs: number;
  isLate: boolean;
  originalName: string;
  size: string;
  attempt: number;
};

const columns: ColumnDef<SubmissionRow, unknown>[] = [
  {
    accessorKey: "title",
    header: "Assessment",
    cell: ({ row }) => (
      <>
        <Link
          href={`/assessments/${row.original.assessmentId}`}
          className="font-medium underline decoration-input underline-offset-4 hover:decoration-foreground"
        >
          {row.original.title}
        </Link>
        <span className="block text-xs text-muted-foreground">
          {row.original.module} · due {row.original.due}
        </span>
      </>
    ),
  },
  {
    accessorKey: "submittedMs",
    header: "Submitted",
    cell: ({ row }) => (
      <>
        <span className="font-mono text-xs">{row.original.submitted}</span>
        {row.original.isLate ? (
          <Stamp tone="watch" className="ml-2">
            Late
          </Stamp>
        ) : null}
      </>
    ),
  },
  {
    accessorKey: "originalName",
    header: "File",
    cell: ({ row }) => (
      <>
        <a
          href={`/api/submissions/${row.original.id}/file`}
          className="underline decoration-input underline-offset-4 hover:decoration-foreground"
        >
          {row.original.originalName}
        </a>
        <span className="block text-xs text-muted-foreground">
          {row.original.size}
        </span>
      </>
    ),
  },
  {
    accessorKey: "attempt",
    header: "Attempt",
    meta: { numeric: true, cellClassName: "text-graphite" },
  },
];

export function SubmissionsTable({ rows }: { rows: SubmissionRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      mark={(r) => (r.isLate ? { tone: "watch", label: "Late" } : null)}
      initialSorting={[{ id: "submittedMs", desc: true }]}
      caption="Submitted work"
    />
  );
}
