import { studentOnly } from "@/lib/guards";
import { getStudentAssessments, getStudentMarksheet } from "@/server/queries";
import { averageScore } from "@/lib/grading";
import {
  Figure,
  PageHeader,
  Panel,
  PanelHeader,
  Stamp,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";

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
          <div className="grid grid-cols-3 divide-x divide-rule">
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
          <p className="px-4 py-8 text-sm text-ink-faint">
            Nothing has been released to you yet. Results appear here as soon as
            they are published — you do not need to ask.
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Assessment</Th>
                <Th numeric>Mark</Th>
                <Th>Classification</Th>
                <Th>Released</Th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="align-top">
                  <Td>
                    <span className="font-medium">{r.assessment.title}</span>
                    <span className="block text-xs text-ink-faint">
                      {r.assessment.module}
                    </span>
                    {r.feedback ? (
                      <p className="mt-1.5 max-w-md border-l-2 border-rule-strong pl-3 text-sm text-ink-soft">
                        {r.feedback}
                      </p>
                    ) : null}
                  </Td>
                  <Td
                    numeric
                    className={`text-base ${r.classification.passed ? "" : "text-seal"}`}
                  >
                    {r.score}
                  </Td>
                  <Td>
                    <Stamp tone={r.classification.passed ? "sage" : "seal"}>
                      {r.classification.short}
                    </Stamp>
                  </Td>
                  <Td className="font-mono text-xs text-ink-faint">
                    {r.publishedAt ? formatDate(r.publishedAt) : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      {awaitingRelease.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Handed in, not yet released"
            hint="Your work is recorded. The mark is not published yet."
          />
          <ul className="divide-y divide-rule">
            {awaitingRelease.map(({ assessment, submission }) => (
              <li
                key={assessment.id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-4"
              >
                <div>
                  <p className="font-medium">{assessment.title}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
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
