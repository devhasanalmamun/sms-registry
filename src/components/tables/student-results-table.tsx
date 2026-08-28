"use client";

import Link from "next/link";
import { DataTable, type ColumnDef } from "@/components/data-table";
import { Stamp } from "@/components/registry";
import { Button } from "@/components/ui/button";
import { setResultPublished } from "@/server/actions";

/**
 * Every mark a student has, published or not.
 *
 * This is the one screen where a withheld mark is visible, and it is staff-only.
 * The publish control is a form posting a server action, so releasing a result
 * is a real navigation with a real audit trail rather than a background fetch.
 */
export type StudentResultRow = {
  id: string;
  assessmentId: string;
  title: string;
  feedback: string | null;
  score: number;
  band: string;
  passed: boolean;
  published: boolean;
  publishedOn: string | null;
};

const columns: ColumnDef<StudentResultRow, unknown>[] = [
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
        {row.original.feedback ? (
          <span className="mt-0.5 block max-w-md text-xs text-muted-foreground">
            {row.original.feedback}
          </span>
        ) : null}
      </>
    ),
  },
  {
    accessorKey: "score",
    header: "Mark",
    cell: ({ row }) => (
      <span className={row.original.passed ? "" : "text-destructive"}>
        {row.original.score}
      </span>
    ),
    meta: { numeric: true },
  },
  {
    accessorKey: "band",
    header: "Classification",
    meta: { cellClassName: "text-ink-soft" },
  },
  {
    accessorKey: "published",
    header: "Released to student",
    cell: ({ row }) =>
      row.original.published ? (
        <span className="text-sm text-sage">
          Published {row.original.publishedOn ?? ""}
        </span>
      ) : (
        <Stamp tone="seal">Withheld</Stamp>
      ),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <form action={setResultPublished}>
        <input type="hidden" name="resultId" value={row.original.id} />
        <input
          type="hidden"
          name="publish"
          value={String(!row.original.published)}
        />
        <Button
          type="submit"
          size="sm"
          variant={row.original.published ? "destructive" : "default"}
        >
          {row.original.published ? "Withhold" : "Publish"}
        </Button>
      </form>
    ),
    meta: { cellClassName: "text-right" },
  },
];

export function StudentResultsTable({ rows }: { rows: StudentResultRow[] }) {
  return <DataTable columns={columns} data={rows} caption="Marks" />;
}
