import Link from "next/link";
import { staffOnly } from "@/lib/guards";
import { listAssessments } from "@/server/queries";
import { AssessmentForm } from "@/components/assessment-form";
import {
  EmptyState,
  PageHeader,
  Panel,
  PanelHeader,
  Stamp,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { formatDateTime, relativeToNow } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  await staffOnly();
  const assessments = await listAssessments();

  return (
    <>
      <PageHeader
        eyebrow="Assessment"
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
          <Table>
            <thead>
              <tr>
                <Th>Assessment</Th>
                <Th>Deadline</Th>
                <Th numeric>In</Th>
                <Th numeric>Late</Th>
                <Th numeric>Unmarked</Th>
                <Th>Results</Th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => {
                const { closed } = a;
                const withheld = a.counts.marked - a.counts.published;

                return (
                  <tr key={a.id} className="hover:bg-paper">
                    <Td>
                      <Link
                        href={`/assessments/${a.id}`}
                        className="font-medium underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                      >
                        {a.title}
                      </Link>
                      <span className="block text-xs text-ink-faint">{a.module}</span>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs">
                        {formatDateTime(a.dueAt)}
                      </span>
                      <span
                        className={`block text-xs ${closed ? "text-ink-faint" : "text-amber"}`}
                      >
                        {closed ? `closed ${relativeToNow(a.dueAt)}` : relativeToNow(a.dueAt)}
                      </span>
                    </Td>
                    <Td numeric>
                      <span className="text-ink">{a.counts.submitted}</span>
                      <span className="text-ink-faint">/{a.counts.expected}</span>
                    </Td>
                    <Td numeric className={a.counts.late > 0 ? "text-amber" : "text-ink-faint"}>
                      {a.counts.late || "—"}
                    </Td>
                    <Td
                      numeric
                      className={a.counts.awaitingMark > 0 ? "text-ink" : "text-ink-faint"}
                    >
                      {a.counts.awaitingMark || "—"}
                    </Td>
                    <Td>
                      {a.counts.marked === 0 ? (
                        <span className="text-xs text-ink-faint">Not marked</span>
                      ) : withheld > 0 ? (
                        <Stamp tone="seal">{withheld} withheld</Stamp>
                      ) : (
                        <Stamp tone="sage">All published</Stamp>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
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
