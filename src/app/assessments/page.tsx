import { staffOnly } from "@/lib/guards";
import { listAssessmentsFor } from "@/server/queries";
import { formatDateTime, relativeToNow } from "@/lib/format";
import {
  EmptyState,
  Figure,
  Footing,
  LinkButton,
  PageHeader,
  Panel,
} from "@/components/registry";
import { AssessmentsTable } from "@/components/tables/assessments-table";

export const dynamic = "force-dynamic";

/**
 * A staff member's own assessments — and their to-do list.
 *
 * There is no separate teaching dashboard: this list, with what has come in
 * against each deadline and how much is still unmarked or unreleased, already
 * answers "what needs doing today" for a marker. A second page summarising it
 * would be a page that exists to have a page.
 */
export default async function AssessmentsPage() {
  const staff = await staffOnly();
  const assessments = await listAssessmentsFor(staff.id);

  const rows = assessments.map((a) => ({
    id: a.id,
    title: a.title,
    module: a.module,
    programme: a.programme.code,
    programmeName: a.programme.name,
    dueAtMs: a.dueAt.getTime(),
    deadline: formatDateTime(a.dueAt),
    relative: relativeToNow(a.dueAt),
    closed: a.closed,
    submitted: a.counts.submitted,
    expected: a.counts.expected,
    late: a.counts.late,
    awaitingMark: a.counts.awaitingMark,
    marked: a.counts.marked,
    withheld: a.counts.withheld,
  }));

  const total = (pick: (r: (typeof rows)[number]) => number) =>
    rows.reduce((sum, r) => sum + pick(r), 0);

  const awaiting = total((r) => r.awaitingMark);
  const withheld = total((r) => r.withheld);

  return (
    <>
      <PageHeader
        title="My assessments"
        lede="Everything you have set, what has come in against it, and what is still waiting on you. Nobody else can mark these or release their results."
        action={
          <LinkButton href="/assessments/new" variant="default">
            Set an assessment
          </LinkButton>
        }
      />

      {rows.length > 0 ? (
        <Footing className="mb-6">
          <Figure value={rows.length} label="Set by you" />
          <Figure
            value={awaiting || "—"}
            label="Awaiting your mark"
            tone={awaiting > 0 ? "watch" : "quiet"}
          />
          <Figure
            value={withheld || "—"}
            label="Marked, not released"
            tone={withheld > 0 ? "flag" : "quiet"}
          />
          <Figure value={total((r) => r.late) || "—"} label="Handed in late" />
        </Footing>
      ) : null}

      <Panel>
        {rows.length === 0 ? (
          <EmptyState
            title="You have not set any assessments yet."
            action={
              <LinkButton href="/assessments/new" variant="default">
                Set an assessment
              </LinkButton>
            }
          >
            Students can only submit against an assessment that exists, and only
            the students on the course it is set for will see it.
          </EmptyState>
        ) : (
          <AssessmentsTable rows={rows} />
        )}
      </Panel>
    </>
  );
}
