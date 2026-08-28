import { staffOnly } from "@/lib/guards";
import { listAssessments } from "@/server/queries";
import { AssessmentForm } from "@/components/assessment-form";
import { formatDateTime, relativeToNow } from "@/lib/format";
import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/registry";
import { AssessmentsTable } from "@/components/tables/assessments-table";

export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  await staffOnly();
  const assessments = await listAssessments();

  const rows = assessments.map((a) => ({
    id: a.id,
    title: a.title,
    module: a.module,
    dueAtMs: a.dueAt.getTime(),
    deadline: formatDateTime(a.dueAt),
    relative: relativeToNow(a.dueAt),
    closed: a.closed,
    submitted: a.counts.submitted,
    expected: a.counts.expected,
    late: a.counts.late,
    awaitingMark: a.counts.awaitingMark,
    marked: a.counts.marked,
    withheld: a.counts.marked - a.counts.published,
  }));

  return (
    <>
      <PageHeader
        title="Assessments"
        lede="Deadlines, what has come in against them, and how much of it is still unmarked or unpublished."
      />

      <Panel className="mb-6">
        {assessments.length === 0 ? (
          <EmptyState title="No assessments yet.">
            Create one below. Students can only submit against an assessment
            that exists.
          </EmptyState>
        ) : (
          <AssessmentsTable rows={rows} />
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Create an assessment"
          hint="The deadline decides what counts as late and when resubmission closes."
        />
        <AssessmentForm />
      </Panel>
    </>
  );
}
