import { requireStudent } from "@/lib/session";
import { getStudentDetail } from "@/server/queries";
import {
  Code,
  Figure,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * The student's fee account.
 *
 * Same ledger the bursary office sees, phrased for the person who owes the
 * money: what was charged, what has been received, what is left, and by when.
 * No "arrears" jargon and no seal-red unless something is genuinely late.
 */
export default async function MyFeesPage() {
  const student = await requireStudent();
  const detail = await getStudentDetail(student.id);
  if (!detail) return null;

  const { fees } = detail;

  return (
    <>
      <PageHeader
        eyebrow="Fee account"
        title="My fees"
        lede={`${detail.programme.name} · Year ${detail.academicYear}`}
      />

      <div className="mb-6 space-y-3">
        {fees.isOverdue ? (
          <Notice tone="seal">
            {formatMoney(fees.overdueAmount.toFixed(2))} is past its due date.
            Contact the bursary office to arrange payment — this can affect your
            enrolment.
          </Notice>
        ) : fees.inCredit ? (
          <Notice tone="amber">
            Your account is {formatMoney(fees.balance.negated().toFixed(2))} in
            credit. The bursary office will be in touch about a refund.
          </Notice>
        ) : fees.balance.isZero() ? (
          <Notice tone="sage">Your fees are fully paid. Nothing is outstanding.</Notice>
        ) : (
          <Notice tone="neutral">
            {formatMoney(fees.balance.toFixed(2))} remains, due{" "}
            {fees.nextDueDate ? formatDate(fees.nextDueDate) : "later this year"}.
            Nothing is overdue.
          </Notice>
        )}
      </div>

      <Panel className="mb-6">
        <div className="grid grid-cols-3 divide-x divide-rule">
          <Figure value={formatMoney(fees.charged.toFixed(2))} label="Charged" />
          <Figure value={formatMoney(fees.paid.toFixed(2))} label="Paid" tone="sage" />
          <Figure
            value={
              fees.inCredit
                ? formatMoney(fees.balance.negated().toFixed(2))
                : formatMoney(fees.balance.toFixed(2))
            }
            label={fees.inCredit ? "In credit" : "Still to pay"}
            tone={fees.isOverdue ? "seal" : fees.inCredit ? "amber" : "neutral"}
          />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="What you have been charged" />
          {detail.charges.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-faint">
              Nothing has been charged to your account.
            </p>
          ) : (
            <Table className="min-w-0">
              <thead>
                <tr>
                  <Th>Item</Th>
                  <Th>Due by</Th>
                  <Th numeric>Amount</Th>
                </tr>
              </thead>
              <tbody>
                {detail.charges.map((charge) => (
                  <tr key={charge.id}>
                    <Td>{charge.description}</Td>
                    <Td className="font-mono text-xs text-ink-soft">
                      {formatDate(charge.dueDate)}
                    </Td>
                    <Td numeric>{formatMoney(charge.amount.toFixed(2))}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="What you have paid" hint="Keep the reference for your records." />
          {detail.payments.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-faint">
              No payment has been received yet.
            </p>
          ) : (
            <Table className="min-w-0">
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Date</Th>
                  <Th numeric>Amount</Th>
                </tr>
              </thead>
              <tbody>
                {detail.payments.map((payment) => (
                  <tr key={payment.id}>
                    <Td>
                      <Code>{payment.reference}</Code>
                      <span className="block text-xs text-ink-faint">
                        {payment.method}
                      </span>
                    </Td>
                    <Td className="font-mono text-xs text-ink-soft">
                      {formatDate(payment.paidAt)}
                    </Td>
                    <Td numeric className="text-sage">
                      {formatMoney(payment.amount.toFixed(2))}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
