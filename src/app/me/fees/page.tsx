import { studentOnly } from "@/lib/guards";
import { getStudentDetail } from "@/server/queries";
import { formatDate, formatMoney } from "@/lib/format";
import { Figure, Footing, Notice, PageHeader, Panel, PanelHeader } from "@/components/registry";
import { ChargesTable, PaymentsTable } from "@/components/tables/ledger-tables";

export const dynamic = "force-dynamic";

/**
 * The student's fee account.
 *
 * Same ledger the bursary office sees, phrased for the person who owes the
 * money: what was charged, what has been received, what is left, and by when.
 * No "arrears" jargon and no seal-red unless something is genuinely late.
 */
export default async function MyFeesPage() {
  const student = await studentOnly();
  const detail = await getStudentDetail(student.id);
  if (!detail) return null;

  const { fees } = detail;

  const chargeRows = detail.charges.map((c) => ({
    id: c.id,
    description: c.description,
    due: formatDate(c.dueDate),
    dueMs: c.dueDate.getTime(),
    amount: Number(c.amount.toFixed(2)),
    pastDue: c.pastDue,
  }));

  const paymentRows = detail.payments.map((p) => ({
    id: p.id,
    reference: p.reference,
    detail: p.method,
    received: formatDate(p.paidAt),
    receivedMs: p.paidAt.getTime(),
    amount: Number(p.amount.toFixed(2)),
  }));

  return (
    <>
      <PageHeader
        title="My fees"
        lede={`${detail.programme.name} · Year ${detail.academicYear}`}
      />

      <div className="mb-6 space-y-3">
        {fees.isOverdue ? (
          <Notice tone="flag">
            {formatMoney(fees.overdueAmount.toFixed(2))} is past its due date.
            Contact the bursary office to arrange payment — this can affect your
            enrolment.
          </Notice>
        ) : fees.inCredit ? (
          <Notice tone="watch">
            Your account is {formatMoney(fees.balance.negated().toFixed(2))} in
            credit. The bursary office will be in touch about a refund.
          </Notice>
        ) : fees.balance.isZero() ? (
          <Notice tone="clear">Your fees are fully paid. Nothing is outstanding.</Notice>
        ) : (
          <Notice tone="neutral">
            {formatMoney(fees.balance.toFixed(2))} remains, due{" "}
            {fees.nextDueDate ? formatDate(fees.nextDueDate) : "later this year"}.
            Nothing is overdue.
          </Notice>
        )}
      </div>

      <Panel className="mb-6">
        <Footing>
          <Figure value={formatMoney(fees.charged.toFixed(2))} label="Charged" />
          <Figure value={formatMoney(fees.paid.toFixed(2))} label="Paid" tone="clear" />
          <Figure
            value={
              fees.inCredit
                ? formatMoney(fees.balance.negated().toFixed(2))
                : formatMoney(fees.balance.toFixed(2))
            }
            label={fees.inCredit ? "In credit" : "Still to pay"}
            tone={fees.isOverdue ? "flag" : fees.inCredit ? "watch" : "neutral"}
          />
        </Footing>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="What you have been charged" />
          {detail.charges.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nothing has been charged to your account.
            </p>
          ) : (
            <ChargesTable rows={chargeRows} />
          )}
        </Panel>

        <Panel>
          <PanelHeader title="What you have paid" />
          {detail.payments.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No payment has been received yet.
            </p>
          ) : (
            <PaymentsTable rows={paymentRows} />
          )}
        </Panel>
      </div>
    </>
  );
}
