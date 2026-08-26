import Link from "next/link";
import { staffOnly } from "@/lib/guards";
import { getRegistryOverview } from "@/server/queries";
import {
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
import { formatDate, formatMoney, relativeToNow } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * The Registry desk.
 *
 * A Registry administrator does not open a dashboard to admire totals; they
 * open it to find out who needs chasing before lunch. So the page leads with
 * the work — arrears, unmarked scripts, withheld results, late submissions —
 * and relegates the headcount to a single ruled summary line, the way a
 * ledger carries its footing.
 */
export default async function DashboardPage() {
  await staffOnly();
  const overview = await getRegistryOverview();

  const totalOverdue = overview.overdue.reduce(
    (acc, s) => acc + Number(s.fees.overdueAmount),
    0,
  );

  const nothingToDo =
    overview.overdue.length === 0 &&
    overview.awaitingMark.length === 0 &&
    overview.unpublished.length === 0 &&
    overview.lateSubmissions.length === 0;

  return (
    <>
      <PageHeader
        eyebrow={`Registry desk · ${formatDate(new Date())}`}
        title="Today"
        lede="Everything on this page is something a person has to do. Counts and totals live below it."
      />

      {nothingToDo ? (
        <Panel className="mb-6 px-4 py-8 text-center">
          <p className="font-display text-lg">Nothing outstanding.</p>
          <p className="mt-1 text-sm text-ink-faint">
            No arrears, no unmarked scripts, no withheld results.
          </p>
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ------------------------------------------------------------- */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Fees in arrears"
            hint={
              overview.overdue.length > 0
                ? `${overview.overdue.length} ${overview.overdue.length === 1 ? "account" : "accounts"} past their due date · ${formatMoney(totalOverdue)} outstanding`
                : "A balance only counts as arrears once a charge has passed its due date."
            }
            action={
              <Link
                href="/fees?filter=overdue"
                className="text-sm text-ink underline underline-offset-4 hover:text-seal"
              >
                Open the fees ledger
              </Link>
            }
          />
          {overview.overdue.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-faint">
              No account is past its due date. Students with a future instalment
              still owe money — that is not arrears, and nobody needs to chase it.
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Programme</Th>
                  <Th>Standing</Th>
                  <Th numeric>Overdue</Th>
                  <Th numeric>Total balance</Th>
                </tr>
              </thead>
              <tbody>
                {overview.overdue.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <Link
                        href={`/students/${s.id}`}
                        className="font-medium underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                      >
                        {s.fullName}
                      </Link>
                      <Code className="ml-2">{s.studentId}</Code>
                    </Td>
                    <Td className="text-ink-soft">{s.programme.code}</Td>
                    <Td>
                      {s.status === "WITHDRAWN" ? (
                        <Stamp tone="neutral">Withdrawn</Stamp>
                      ) : s.status === "DEFERRED" ? (
                        <Stamp tone="neutral">Deferred</Stamp>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </Td>
                    <Td numeric className="font-medium text-seal">
                      {formatMoney(s.fees.overdueAmount.toFixed(2))}
                    </Td>
                    <Td numeric className="text-ink-soft">
                      {formatMoney(s.fees.balance.toFixed(2))}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        {/* ------------------------------------------------------------- */}
        <Panel>
          <PanelHeader
            title="Scripts awaiting a mark"
            hint="Submitted work with no grade entered."
          />
          {overview.awaitingMark.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-faint">
              Every submission has been marked.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {overview.awaitingMark.slice(0, 8).map(({ assessment, submission }) => (
                <li key={submission.id} className="px-4 py-2.5">
                  <Link
                    href={`/assessments/${assessment.id}`}
                    className="text-sm font-medium underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                  >
                    {submission.student.fullName}
                  </Link>
                  {submission.isLate ? (
                    <Stamp tone="amber" className="ml-2">
                      Late
                    </Stamp>
                  ) : null}
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {assessment.title} · submitted {formatDate(submission.submittedAt)}
                  </p>
                </li>
              ))}
              {overview.awaitingMark.length > 8 ? (
                <li className="px-4 py-2 text-xs text-ink-faint">
                  and {overview.awaitingMark.length - 8} more
                </li>
              ) : null}
            </ul>
          )}
        </Panel>

        {/* ------------------------------------------------------------- */}
        <Panel>
          <PanelHeader
            title="Marked but withheld"
            hint="Students cannot see these until someone publishes them."
          />
          {overview.unpublished.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-faint">
              No results are being held back.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {overview.unpublished.map((result) => (
                <li
                  key={result.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/assessments/${result.assessment.id}`}
                      className="text-sm font-medium underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                    >
                      {result.student.fullName}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-ink-faint">
                      {result.assessment.title} · marked {formatDate(result.markedAt)}
                    </p>
                  </div>
                  <Stamp tone="seal">Withheld</Stamp>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ------------------------------------------------------------- */}
        <Panel>
          <PanelHeader
            title="Late submissions"
            hint="Accepted, but flagged for the board."
          />
          {overview.lateSubmissions.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-faint">
              Everything came in on time.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {overview.lateSubmissions.map(({ assessment, submission }) => (
                <li key={submission.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/assessments/${assessment.id}`}
                      className="text-sm font-medium underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                    >
                      {submission.student.fullName}
                    </Link>
                    <Stamp tone="amber">Late</Stamp>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {assessment.title} · deadline was {formatDate(assessment.dueAt)},
                    submitted {formatDate(submission.submittedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ------------------------------------------------------------- */}
        <Panel>
          <PanelHeader
            title="Deadlines this week"
            hint="Assessments closing in the next seven days."
          />
          {overview.closingSoon.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-faint">
              Nothing closes in the next seven days.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {overview.closingSoon.map((assessment) => (
                <li
                  key={assessment.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/assessments/${assessment.id}`}
                      className="text-sm font-medium underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                    >
                      {assessment.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-ink-faint">
                      {assessment.module} · {assessment.submissions.length} in so far
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-amber">
                    {relativeToNow(assessment.dueAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* The footing: counts, kept subordinate to the work above. */}
      <Panel className="mt-6">
        <PanelHeader title="The register" hint="Headcount as it stands." />
        <div className="grid grid-cols-2 divide-x divide-y divide-rule sm:grid-cols-3 lg:grid-cols-6">
          <Figure value={overview.counts.total} label="On the register" />
          <Figure value={overview.counts.enrolled} label="Enrolled" tone="sage" />
          <Figure value={overview.counts.deferred} label="Deferred" />
          <Figure value={overview.counts.withdrawn} label="Withdrawn" />
          <Figure value={overview.counts.completed} label="Completed" />
          <Figure
            value={overview.counts.inCredit}
            label="In credit"
            tone={overview.counts.inCredit > 0 ? "amber" : "neutral"}
          />
        </div>
      </Panel>
    </>
  );
}
