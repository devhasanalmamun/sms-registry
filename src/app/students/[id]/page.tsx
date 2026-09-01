import { notFound } from "next/navigation";
import { registryOnly } from "@/lib/guards";
import { getStudentDetail, listProgrammes } from "@/server/queries";
import { updateStudent } from "@/server/actions";
import { StatusStamp } from "@/components/status-stamp";
import { StudentForm } from "@/components/student-form";
import { ChargeForm, PaymentForm } from "@/components/fee-forms";
import { Figure, Footing, PageHeader, Panel, PanelHeader, Stamp } from "@/components/registry";
import { ChargesTable, PaymentsTable } from "@/components/tables/ledger-tables";
import {
  formatDate,
  formatMoney,
  toDateInput,
} from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * The student record: one screen that answers every question Registry gets
 * asked on the phone — who they are, what they owe, what they handed in, and
 * what they have been told.
 */
export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await registryOnly();
  const { id } = await params;

  const [student, programmes] = await Promise.all([
    getStudentDetail(id),
    listProgrammes(),
  ]);

  if (!student) notFound();

  const { fees } = student;

  const chargeRows = student.charges.map((c) => ({
    id: c.id,
    description: c.description,
    due: formatDate(c.dueDate),
    dueMs: c.dueDate.getTime(),
    amount: Number(c.amount.toFixed(2)),
    pastDue: c.pastDue,
  }));

  const paymentRows = student.payments.map((p) => ({
    id: p.id,
    reference: p.reference,
    detail: p.note ? `${p.method} · ${p.note}` : p.method,
    received: formatDate(p.paidAt),
    receivedMs: p.paidAt.getTime(),
    amount: Number(p.amount.toFixed(2)),
  }));

  return (
    <>
      <PageHeader
        trail={{ href: "/students", label: "All students" }}
        reference={student.studentId}
        title={student.fullName}
        lede={`${student.programme.code} — ${student.programme.name} · Year ${student.academicYear} · Enrolled ${formatDate(student.enrolledAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusStamp status={student.status} />
            {fees.isOverdue ? <Stamp tone="flag">Late</Stamp> : null}
            {fees.inCredit ? <Stamp tone="watch">Overpaid</Stamp> : null}
          </div>
        }
      />

      {/* ----------------------------------------------------------------- */}
      <Panel className="mb-6">
        <PanelHeader
          title="Fee account"
          hint={
            fees.isOverdue
              ? "This student is behind on a payment and should be chased."
              : fees.inCredit
                ? "This student has paid more than they were charged. A refund may be due."
                : fees.nextDueDate
                  ? `Next instalment falls due ${formatDate(fees.nextDueDate)}.`
                  : "Nothing left to pay."
          }
        />
        <Footing>
          <Figure value={formatMoney(fees.charged.toFixed(2))} label="Charged" />
          <Figure value={formatMoney(fees.paid.toFixed(2))} label="Received" tone="clear" />
          <Figure
            value={
              fees.inCredit
                ? formatMoney(fees.balance.negated().toFixed(2))
                : formatMoney(fees.balance.toFixed(2))
            }
            label={fees.inCredit ? "Overpaid" : "Balance"}
            tone={fees.inCredit ? "watch" : fees.balance.greaterThan(0) ? "neutral" : "clear"}
          />
          <Figure
            value={formatMoney(fees.overdueAmount.toFixed(2))}
            label="Overdue"
            tone={fees.isOverdue ? "flag" : "neutral"}
          />
        </Footing>
      </Panel>

      {/* The ledger, kept as two columns: debits and credits. --------------- */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Charges" hint="What the student has been billed." />
          {student.charges.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nothing has been charged to this account.
            </p>
          ) : (
            <ChargesTable rows={chargeRows} />
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Payments" hint="What has been received, and against which reference." />
          {student.payments.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No payment has been received yet.
            </p>
          ) : (
            <PaymentsTable rows={paymentRows} />
          )}
        </Panel>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Record a payment" hint="Posts a credit to this account." />
          <PaymentForm studentId={student.id} />
        </Panel>
        <Panel>
          <PanelHeader title="Raise a charge" hint="A resit fee, a penalty, a deposit." />
          <ChargeForm studentId={student.id} />
        </Panel>
      </div>

      {/*
       * No submissions and no marks on this page.
       *
       * They are the teaching side's, and this office has no authority over
       * either — showing them here would invite "can you just release Hassan's
       * mark?", which is a request Registry cannot action.
       */}
      {/* ----------------------------------------------------------------- */}
      <StudentForm
        action={updateStudent}
        title="Amend this record"
        hint="Changing a status here is what moves a student between enrolled, deferred, withdrawn and completed."
        submitLabel="Save changes"
        programmes={programmes.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          feeAmount: p.feeAmount.toFixed(2),
        }))}
        defaults={{
          id: student.id,
          fullName: student.fullName,
          email: student.email,
          dateOfBirth: toDateInput(student.dateOfBirth),
          programmeId: student.programmeId,
          academicYear: student.academicYear,
          status: student.status,
        }}
      />
    </>
  );
}
