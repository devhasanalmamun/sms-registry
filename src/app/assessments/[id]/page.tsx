import { notFound } from "next/navigation";
import { staffOnly } from "@/lib/guards";
import { getAssessmentDetail } from "@/server/queries";
import { publishAllResults } from "@/server/actions";
import { averageScore } from "@/lib/grading";
import { formatBytes, formatDateTime, relativeToNow } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Figure, Footing, PageHeader, Panel, PanelHeader } from "@/components/registry";
import { MarksheetTable } from "@/components/tables/marksheet-table";

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

  const sheet = rows.map(({ student, submission, result }) => ({
    studentId: student.id,
    studentCode: student.studentId,
    fullName: student.fullName,
    programmeCode: student.programme.code,
    submission: submission
      ? {
          id: submission.id,
          originalName: submission.originalName,
          submittedAt: formatDateTime(submission.submittedAt),
          size: formatBytes(submission.sizeBytes),
          attempt: submission.attempt,
          isLate: submission.isLate,
        }
      : null,
    resultId: result?.id ?? null,
    score: result?.score ?? null,
    feedback: result?.feedback ?? null,
    published: result?.published ?? false,
  }));

  return (
    <>
      <PageHeader
        trail={{ href: "/assessments", label: "All assessments" }}
        reference={assessment.module}
        title={assessment.title}
        lede={
          closed
            ? `Deadline passed ${relativeToNow(assessment.dueAt)} (${formatDateTime(assessment.dueAt)}). Resubmission is closed; late work is still accepted and flagged.`
            : `Open until ${formatDateTime(assessment.dueAt)} — ${relativeToNow(assessment.dueAt)}. Students may resubmit until then.`
        }
      />

      <Panel className="mb-6">
        <Footing>
          <Figure
            value={`${submitted.length}/${rows.length}`}
            label="Submitted"
          />
          <Figure
            value={late.length}
            label="Late"
            tone={late.length > 0 ? "watch" : "neutral"}
          />
          <Figure value={submitted.length - marked.length} label="Unmarked" />
          <Figure
            value={withheld.length}
            label="Withheld"
            tone={withheld.length > 0 ? "flag" : "neutral"}
          />
          <Figure value={average ?? "—"} label="Mean mark" />
        </Footing>
      </Panel>

      <Panel>
        <PanelHeader
          title="Marking sheet"
          hint="Saving a mark does not release it. Publishing is a separate, deliberate act."
          action={
            withheld.length > 0 ? (
              <form action={publishAllResults}>
                <input type="hidden" name="assessmentId" value={assessment.id} />
                <Button type="submit" variant="default" size="sm">
                  Publish all {withheld.length} withheld
                </Button>
              </form>
            ) : null
          }
        />
        <MarksheetTable assessmentId={assessment.id} rows={sheet} />
      </Panel>
    </>
  );
}
