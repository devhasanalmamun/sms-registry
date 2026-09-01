import Link from "next/link";
import { registryOnly } from "@/lib/guards";
import { getRegistryOverview } from "@/server/queries";
import { formatDate, formatMoney } from "@/lib/format";
import { sumDecimals } from "@/lib/money";
import { Figure, Footing, PageHeader, Panel, PanelHeader } from "@/components/registry";
import { ArrearsTable } from "@/components/tables/arrears-table";

export const dynamic = "force-dynamic";

/**
 * The Registry desk.
 *
 * A Registry administrator does not open a dashboard to admire totals; they
 * open it to find out who needs chasing before lunch. So the page leads with
 * the work — who is late paying — and relegates the headcount to a single ruled summary
 * line, the way a ledger carries its footing.
 *
 * Marking queues and withheld results used to appear here too. They belong to
 * teaching staff, who are the only people who can act on them: a dashboard that
 * lists work you have no authority to do is a page of other people's problems.
 */
export default async function DashboardPage() {
  await registryOnly();
  const overview = await getRegistryOverview();

  const totalOverdue = sumDecimals(
    overview.overdue.map((s) => s.fees.overdueAmount),
  );

  const arrearsRows = overview.overdue.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    fullName: s.fullName,
    programmeCode: s.programme.code,
    status: s.status,
    overdueAmount: Number(s.fees.overdueAmount.toFixed(2)),
    balance: Number(s.fees.balance.toFixed(2)),
  }));

  return (
    <>
      <PageHeader
        reference={formatDate(new Date())}
        title="Today"
        lede="The Registry desk: enrolment and money. Everything here is something somebody has to act on, and the counts sit at the bottom, because nobody starts their day with a total."
      />

      <Panel className="mb-6">
        <PanelHeader
          title="Late payments"
          hint={
            overview.overdue.length > 0
              ? `${overview.overdue.length} ${overview.overdue.length === 1 ? "account" : "accounts"} past their due date · ${formatMoney(totalOverdue.toFixed(2))} still owed`
              : "A balance only counts as late once a charge has passed its due date."
          }
          action={
            <Link
              href="/fees?filter=overdue"
              className="text-sm text-foreground underline underline-offset-4 hover:text-flag"
            >
              Open the fees page
            </Link>
          }
        />
        {overview.overdue.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No account is past its due date. Students with a future instalment
            still owe money — that is not late, and nobody needs to chase it.
          </p>
        ) : (
          <ArrearsTable rows={arrearsRows} />
        )}
      </Panel>

      {/* The footing: counts, kept subordinate to the work above. */}
      <Panel>
        <PanelHeader title="The register" hint="Headcount as it stands." />
        <Footing>
          <Figure value={overview.counts.total} label="On the register" />
          <Figure value={overview.counts.enrolled} label="Enrolled" tone="clear" />
          <Figure value={overview.counts.deferred} label="Deferred" />
          <Figure value={overview.counts.withdrawn} label="Withdrawn" />
          <Figure value={overview.counts.completed} label="Completed" />
          <Figure
            value={overview.counts.inCredit}
            label="Overpaid"
            tone={overview.counts.inCredit > 0 ? "watch" : "neutral"}
          />
        </Footing>
      </Panel>
    </>
  );
}
