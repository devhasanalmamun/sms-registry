import Link from "next/link";
import { staffOnly } from "@/lib/guards";
import { getRegistryOverview } from "@/server/queries";
import { formatDate, formatMoney, relativeToNow } from "@/lib/format";
import { sumDecimals } from "@/lib/money";
import { Figure, Footing, PageHeader, Panel, PanelHeader, Stamp } from "@/components/registry";
import { ArrearsTable } from "@/components/tables/arrears-table";

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

  const totalOverdue = sumDecimals(
    overview.overdue.map((s) => s.fees.overdueAmount),
  );

  const nothingToDo =
    overview.overdue.length === 0 &&
    overview.awaitingMark.length === 0 &&
    overview.unpublished.length === 0 &&
    overview.lateSubmissions.length === 0;

  const arrearsRows = overview.overdue.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    fullName: s.fullName,
    programmeCode: s.programme.code,
    status: s.status,
    overdueAmount: Number(s.fees.overdueAmount.toFixed(2)),
    balance: Number(s.fees.balance.toFixed(2)),
  }));

  const today = formatDate(new Date());

  return (
    <>
      <PageHeader
        reference={today}
        title="Today"
        lede="Everything on this page is something a person has to do. Counts and totals live below it."
      />

      {nothingToDo ? (
        <Panel className="mb-6 px-4 py-8 text-center">
          <p className="font-semibold text-lg">Nothing outstanding.</p>
          <p className="mt-1 text-sm text-muted-foreground">
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
                ? `${overview.overdue.length} ${overview.overdue.length === 1 ? "account" : "accounts"} past their due date · ${formatMoney(totalOverdue.toFixed(2))} outstanding`
                : "A balance only counts as arrears once a charge has passed its due date."
            }
            action={
              <Link
                href="/fees?filter=overdue"
                className="text-sm text-foreground underline underline-offset-4 hover:text-flag"
              >
                Open the fees ledger
              </Link>
            }
          />
          {overview.overdue.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No account is past its due date. Students with a future instalment
              still owe money — that is not arrears, and nobody needs to chase it.
            </p>
          ) : (
            <ArrearsTable rows={arrearsRows} />
          )}
        </Panel>

        {/* ------------------------------------------------------------- */}
        <Panel>
          <PanelHeader
            title="Scripts awaiting a mark"
            hint="Submitted work with no grade entered."
          />
          {overview.awaitingMark.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Every submission has been marked.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {overview.awaitingMark.slice(0, 8).map(({ assessment, submission }) => (
                <li key={submission.id} className="px-4 py-2.5">
                  <Link
                    href={`/assessments/${assessment.id}`}
                    className="text-sm font-medium underline decoration-input underline-offset-4 hover:decoration-foreground"
                  >
                    {submission.student.fullName}
                  </Link>
                  {submission.isLate ? (
                    <Stamp tone="watch" className="ml-2">
                      Late
                    </Stamp>
                  ) : null}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {assessment.title} · submitted {formatDate(submission.submittedAt)}
                  </p>
                </li>
              ))}
              {overview.awaitingMark.length > 8 ? (
                <li className="px-4 py-2 text-xs text-muted-foreground">
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
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No results are being held back.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {overview.unpublished.map((result) => (
                <li
                  key={result.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/assessments/${result.assessment.id}`}
                      className="text-sm font-medium underline decoration-input underline-offset-4 hover:decoration-foreground"
                    >
                      {result.student.fullName}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {result.assessment.title} · marked {formatDate(result.markedAt)}
                    </p>
                  </div>
                  <Stamp tone="flag">Withheld</Stamp>
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
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Everything came in on time.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {overview.lateSubmissions.map(({ assessment, submission }) => (
                <li key={submission.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/assessments/${assessment.id}`}
                      className="text-sm font-medium underline decoration-input underline-offset-4 hover:decoration-foreground"
                    >
                      {submission.student.fullName}
                    </Link>
                    <Stamp tone="watch">Late</Stamp>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
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
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nothing closes in the next seven days.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {overview.closingSoon.map((assessment) => (
                <li
                  key={assessment.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/assessments/${assessment.id}`}
                      className="text-sm font-medium underline decoration-input underline-offset-4 hover:decoration-foreground"
                    >
                      {assessment.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {assessment.module} · {assessment.submissions.length} in so far
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-watch">
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
        <Footing>
          <Figure value={overview.counts.total} label="On the register" />
          <Figure value={overview.counts.enrolled} label="Enrolled" tone="clear" />
          <Figure value={overview.counts.deferred} label="Deferred" />
          <Figure value={overview.counts.withdrawn} label="Withdrawn" />
          <Figure value={overview.counts.completed} label="Completed" />
          <Figure
            value={overview.counts.inCredit}
            label="In credit"
            tone={overview.counts.inCredit > 0 ? "watch" : "neutral"}
          />
        </Footing>
      </Panel>
    </>
  );
}
