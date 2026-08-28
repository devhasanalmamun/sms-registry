import { studentOnly } from "@/lib/guards";
import { getStudentAssessments } from "@/server/queries";
import { SubmissionUpload } from "@/components/submission-upload";
import { formatBytes, formatDateTime, relativeToNow } from "@/lib/format";
import { EmptyState, Notice, PageHeader, Panel, Stamp } from "@/components/registry";

export const dynamic = "force-dynamic";

/**
 * The student's work.
 *
 * Ordered by deadline so the thing due next is at the top, which is the only
 * ordering a student in the week before a deadline cares about.
 */
export default async function MyAssessmentsPage() {
  const student = await studentOnly();
  const rows = await getStudentAssessments(student.id);

  const withdrawn = student.status === "WITHDRAWN";

  return (
    <>
      <PageHeader
        eyebrow="Submissions"
        title="My work"
        lede="One submission per assessment. Before the deadline you can replace it as often as you like; after it, what is on record stands."
      />

      {withdrawn ? (
        <div className="mb-6">
          <Notice tone="seal">
            Your enrolment is recorded as withdrawn, so new submissions are
            closed. Contact Registry if that is not right.
          </Notice>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <Panel>
          <EmptyState title="No assessments have been set.">
            When staff create an assessment it will appear here with its
            deadline.
          </EmptyState>
        </Panel>
      ) : (
        <div className="space-y-6">
          {rows.map(({ assessment, closed, submission, releasedScore }) => {
            return (
              <Panel key={assessment.id}>
                <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-b border-border px-4 py-3">
                  <div>
                    <h2 className="font-display text-lg leading-tight">
                      {assessment.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {assessment.module}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-ink-soft">
                      {formatDateTime(assessment.dueAt)}
                    </p>
                    <p
                      className={`text-xs ${closed ? "text-muted-foreground" : "text-amber"}`}
                    >
                      {closed
                        ? `deadline passed ${relativeToNow(assessment.dueAt)}`
                        : `due ${relativeToNow(assessment.dueAt)}`}
                    </p>
                  </div>
                </header>

                <div className="space-y-4 px-4 py-4">
                  {submission ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-background px-3 py-2.5">
                      <div className="min-w-0">
                        <a
                          href={`/api/submissions/${submission.id}/file`}
                          className="text-sm underline decoration-input underline-offset-4 hover:decoration-foreground"
                        >
                          {submission.originalName}
                        </a>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(submission.submittedAt)} ·{" "}
                          {formatBytes(submission.sizeBytes)}
                          {submission.attempt > 1
                            ? ` · attempt ${submission.attempt}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {submission.isLate ? (
                          <Stamp tone="amber">Late</Stamp>
                        ) : (
                          <Stamp tone="sage">On time</Stamp>
                        )}
                        {releasedScore !== null ? (
                          <Stamp tone="sage">Marked {releasedScore}/100</Stamp>
                        ) : (
                          <Stamp tone="quiet">Awaiting result</Stamp>
                        )}
                      </div>
                    </div>
                  ) : closed ? (
                    <Notice tone="seal">
                      Nothing was submitted before the deadline. You can still
                      upload — it will be recorded as late and referred to the
                      board.
                    </Notice>
                  ) : null}

                  {withdrawn ? null : (
                    <SubmissionUpload
                      assessmentId={assessment.id}
                      isLate={closed}
                      hasExisting={Boolean(submission)}
                      canResubmit={!closed}
                    />
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
