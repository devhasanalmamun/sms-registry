import { studentOnly } from "@/lib/guards";
import { getStudentAssessments, getStudentMarksheet } from "@/server/queries";
import { averageScore } from "@/lib/grading";
import { formatDate, formatDateTime } from "@/lib/format";
import { Figure, PageHeader, Panel, PanelHeader, Stamp } from "@/components/registry";
import { ReleasedResultsTable } from "@/components/tables/released-results-table";

export const dynamic = "force-dynamic";

/**
 * The student's marksheet.
 *
 * Only published results are on this page, and they are filtered out in the
 * database query rather than hidden in the markup — see
 * `getStudentMarksheet`. Work that has been handed in but not released is
 * still acknowledged, without the mark: silence would read as "they have lost
 * my paper", and that is a phone call to Registry.
 */
export default async function MarksheetPage() {
  const student = await studentOnly();

  const [results, assessments] = await Promise.all([
    getStudentMarksheet(student.id),
    getStudentAssessments(student.id),
  ]);

  const releasedIds = new Set(results.map((r) => r.assessment.id));
  const awaitingRelease = assessments.filter(
    (a) => a.submission && !releasedIds.has(a.assessment.id),
  );

  const average = averageScore(results.map((r) => r.score));
  const passed = results.filter((r) => r.classification.passed).length;

  const resultRows = results.map((r) => ({
    id: r.id,
    title: r.assessment.title,
    module: r.assessment.module,
    feedback: r.feedback,
    score: r.score,
    classification: r.classification.short,
    passed: r.classification.passed,
    released: r.publishedAt ? formatDate(r.publishedAt) : "—",
    releasedMs: r.publishedAt ? r.publishedAt.getTime() : 0,
  }));

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            Marksheet · <span className="font-mono">{student.studentId}</span>
          </>
        }
        title={student.fullName}
        lede={`${student.programme.name} · Year ${student.academicYear}`}
      />

      {results.length > 0 ? (
        <Panel className="mb-6">
          <div className="grid grid-cols-3 divide-x divide-border">
            <Figure value={results.length} label="Results released" />
            <Figure value={average ?? "—"} label="Mean mark" />
            <Figure
              value={`${passed}/${results.length}`}
              label="Passed"
              tone={passed === results.length ? "sage" : "neutral"}
            />
          </div>
        </Panel>
      ) : null}

      <Panel className="mb-6">
        <PanelHeader
          title="Released results"
          hint="A result appears here once it has been published."
        />
        {results.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            Nothing has been released to you yet. Results appear here as soon as
            they are published — you do not need to ask.
          </p>
        ) : (
          <ReleasedResultsTable rows={resultRows} />
        )}
      </Panel>

      {awaitingRelease.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Handed in, not yet released"
            hint="Your work is recorded. The mark is not published yet."
          />
          <ul className="divide-y divide-border">
            {awaitingRelease.map(({ assessment, submission }) => (
              <li
                key={assessment.id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-4"
              >
                <div>
                  <p className="font-medium">{assessment.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {assessment.module} · submitted{" "}
                    {submission ? formatDateTime(submission.submittedAt) : ""}
                    {submission?.isLate ? " · flagged as late" : ""}
                  </p>
                </div>
                {/* The one place a stamp is allowed to sit askew. */}
                <Stamp tone="seal" struck>
                  Not released
                </Stamp>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}
