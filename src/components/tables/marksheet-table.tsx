"use client";

import { useMemo } from "react";
import Link from "next/link";
import { DataTable, type ColumnDef } from "@/components/data-table";
import { Code, Stamp } from "@/components/registry";
import { SubmitButton } from "@/components/submit-button";
import {
  MarksheetFeedbackCell,
  MarksheetGradeForm,
} from "@/components/marksheet-row";
import { classify } from "@/lib/grading";
import { setResultPublished } from "@/server/actions";

/**
 * The marking sheet.
 *
 * Every student who could have submitted appears, including the ones who did
 * not — a blank row is the single most useful thing on this screen, and a list
 * built only from submissions would hide it. Sorting is why this is a data
 * table: a marker wants "unmarked first", and an exam board wants the marks in
 * order, off the same list.
 */
export type MarksheetRow = {
  studentId: string;
  studentCode: string;
  fullName: string;
  programmeCode: string;
  submission: {
    id: string;
    originalName: string;
    submittedAt: string;
    size: string;
    attempt: number;
    isLate: boolean;
  } | null;
  resultId: string | null;
  score: number | null;
  feedback: string | null;
  published: boolean;
};

export function MarksheetTable({
  assessmentId,
  rows,
}: {
  assessmentId: string;
  rows: MarksheetRow[];
}) {
  const columns = useMemo<ColumnDef<MarksheetRow, unknown>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Student",
        cell: ({ row }) => (
          <>
            <Link
              href={`/students/${row.original.studentId}`}
              className="font-medium underline decoration-input underline-offset-4 hover:decoration-foreground"
            >
              {row.original.fullName}
            </Link>
            <span className="mt-0.5 block">
              <Code>{row.original.studentCode}</Code>
              <span className="ml-2 text-xs text-muted-foreground">
                {row.original.programmeCode}
              </span>
            </span>
          </>
        ),
      },
      {
        id: "submission",
        header: "Submission",
        // Unsubmitted sorts last, so "who is missing" is one click away.
        accessorFn: (row) => (row.submission ? 0 : 1),
        cell: ({ row }) => {
          const s = row.original.submission;
          if (!s) return <Stamp tone="quiet">No submission</Stamp>;
          return (
            <>
              <a
                href={`/api/submissions/${s.id}/file`}
                className="text-sm underline decoration-input underline-offset-4 hover:decoration-foreground"
              >
                {s.originalName}
              </a>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {s.submittedAt} · {s.size}
                {s.attempt > 1 ? ` · attempt ${s.attempt}` : ""}
              </span>
              {s.isLate ? (
                <Stamp tone="watch" className="mt-1">
                  Late
                </Stamp>
              ) : null}
            </>
          );
        },
      },
      {
        id: "mark",
        header: "Mark",
        // Unmarked first: that is the pile still to work through.
        accessorFn: (row) => row.score ?? -1,
        cell: ({ row }) => (
          <MarksheetGradeForm
            assessmentId={assessmentId}
            studentId={row.original.studentId}
            score={row.original.score}
            hasSubmission={Boolean(row.original.submission)}
          />
        ),
      },
      {
        id: "feedback",
        header: "Feedback",
        enableSorting: false,
        cell: ({ row }) => (
          <MarksheetFeedbackCell
            studentId={row.original.studentId}
            feedback={row.original.feedback}
          />
        ),
      },
      {
        id: "classification",
        header: "Class",
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.score === null)
            return <span className="text-muted-foreground">—</span>;
          const band = classify(row.original.score);
          return band.passed ? (
            band.short
          ) : (
            <span className="text-destructive">{band.short}</span>
          );
        },
        meta: { cellClassName: "text-graphite" },
      },
      {
        id: "released",
        header: "Released",
        enableSorting: false,
        cell: ({ row }) => {
          const { resultId, published } = row.original;
          if (!resultId)
            return <span className="text-xs text-muted-foreground">Not marked</span>;
          return (
            <form
              action={setResultPublished}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="resultId" value={resultId} />
              <input type="hidden" name="publish" value={String(!published)} />
              {published ? (
                <Stamp tone="clear">Published</Stamp>
              ) : (
                <Stamp tone="flag">Withheld</Stamp>
              )}
              <SubmitButton
                size="sm"
                variant={published ? "destructive" : "default"}
                pendingLabel={published ? "Withholding…" : "Publishing…"}
              >
                {published ? "Withhold" : "Publish"}
              </SubmitButton>
            </form>
          );
        },
      },
    ],
    [assessmentId],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      // No Attention column here. On every other table it earns its place, but
      // on this one it would say "Withheld" beside a Released cell already
      // saying it, and "Late" beside a Submission cell already stamped Late.
      // Repeating a fact twice in one row does not make it more visible.
      minWidth="60rem"
      alignTop
      caption="Marking sheet"
    />
  );
}
