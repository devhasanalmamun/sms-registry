import Link from "next/link";
import { notFound } from "next/navigation";
import { staffOnly } from "@/lib/guards";
import { getAssessmentDetail } from "@/server/queries";
import { publishAllResults, setResultPublished } from "@/server/actions";
import { averageScore } from "@/lib/grading";
import {
  Button,
  Code,
  Figure,
  PageHeader,
  Panel,
  PanelHeader,
  Stamp,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { MarksheetGradeCells } from "@/components/marksheet-row";
import { formatBytes, formatDateTime, relativeToNow } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * The marking sheet.
 *
 * Every student who could have submitted appears, including the ones who did
 * not — a blank row is the single most useful thing on this screen, and a list
 * built only from submissions would hide it.
 */
export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await staffOnly();
  const { id } = await params;

  const detail = await getAssessmentDetail(id);
  if (!detail) notFound();

  const { assessment, rows, closed } = detail;

  const submitted = rows.filter((r) => r.submission);
  const late = submitted.filter((r) => r.submission?.isLate);
  const marked = rows.filter((r) => r.result);
  const withheld = marked.filter((r) => !r.result?.published);
  const average = averageScore(marked.map((r) => r.result!.score));

  return (
    <>
      <PageHeader
        eyebrow={`Assessment · ${assessment.module}`}
        title={assessment.title}
        lede={
          closed
            ? `Deadline passed ${relativeToNow(assessment.dueAt)} (${formatDateTime(assessment.dueAt)}). Resubmission is closed; late work is still accepted and flagged.`
            : `Open until ${formatDateTime(assessment.dueAt)} — ${relativeToNow(assessment.dueAt)}. Students may resubmit until then.`
        }
        action={
          <Link
            href="/assessments"
            className="text-sm text-ink underline underline-offset-4"
          >
            All assessments
          </Link>
        }
      />

      <Panel className="mb-6">
        <div className="grid grid-cols-2 divide-x divide-y divide-rule sm:grid-cols-5">
          <Figure
            value={`${submitted.length}/${rows.length}`}
            label="Submitted"
          />
          <Figure
            value={late.length}
            label="Late"
            tone={late.length > 0 ? "amber" : "neutral"}
          />
          <Figure value={submitted.length - marked.length} label="Unmarked" />
          <Figure
            value={withheld.length}
            label="Withheld"
            tone={withheld.length > 0 ? "seal" : "neutral"}
          />
          <Figure value={average ?? "—"} label="Mean mark" />
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Marking sheet"
          hint="Saving a mark does not release it. Publishing is a separate, deliberate act."
          action={
            withheld.length > 0 ? (
              <form action={publishAllResults}>
                <input type="hidden" name="assessmentId" value={assessment.id} />
                <Button type="submit" variant="primary" size="sm">
                  Publish all {withheld.length} withheld
                </Button>
              </form>
            ) : null
          }
        />
        <Table className="min-w-[64rem]">
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Submission</Th>
              <Th>Mark and feedback</Th>
              <Th>Classification</Th>
              <Th>Released</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, submission, result }) => (
              <tr key={student.id} className="align-top hover:bg-paper">
                <Td>
                  <Link
                    href={`/students/${student.id}`}
                    className="font-medium underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                  >
                    {student.fullName}
                  </Link>
                  <span className="mt-0.5 block">
                    <Code>{student.studentId}</Code>
                    <span className="ml-2 text-xs text-ink-faint">
                      {student.programme.code}
                    </span>
                  </span>
                </Td>

                <Td>
                  {submission ? (
                    <>
                      <a
                        href={`/api/submissions/${submission.id}/file`}
                        className="text-sm underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                      >
                        {submission.originalName}
                      </a>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {formatDateTime(submission.submittedAt)} ·{" "}
                        {formatBytes(submission.sizeBytes)}
                        {submission.attempt > 1
                          ? ` · attempt ${submission.attempt}`
                          : ""}
                      </span>
                      {submission.isLate ? (
                        <Stamp tone="amber" className="mt-1">
                          Late
                        </Stamp>
                      ) : null}
                    </>
                  ) : (
                    <Stamp tone="quiet">No submission</Stamp>
                  )}
                </Td>

                <MarksheetGradeCells
                  assessmentId={assessment.id}
                  studentId={student.id}
                  score={result?.score ?? null}
                  feedback={result?.feedback ?? null}
                  hasSubmission={Boolean(submission)}
                />

                <Td>
                  {!result ? (
                    <span className="text-xs text-ink-faint">Not marked</span>
                  ) : (
                    <form action={setResultPublished} className="space-y-1.5">
                      <input type="hidden" name="resultId" value={result.id} />
                      <input
                        type="hidden"
                        name="publish"
                        value={String(!result.published)}
                      />
                      {result.published ? (
                        <Stamp tone="sage">Published</Stamp>
                      ) : (
                        <Stamp tone="seal">Withheld</Stamp>
                      )}
                      <Button
                        type="submit"
                        size="sm"
                        variant={result.published ? "danger" : "primary"}
                        className="block w-full"
                      >
                        {result.published ? "Withhold" : "Publish"}
                      </Button>
                    </form>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}
