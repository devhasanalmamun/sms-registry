import Link from "next/link";
import { notFound } from "next/navigation";
import { staffOnly } from "@/lib/guards";
import { getStudentDetail, listProgrammes } from "@/server/queries";
import { updateStudent, setResultPublished } from "@/server/actions";
import { classify } from "@/lib/grading";
import {
  Button,
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
import { StatusStamp } from "@/components/status-stamp";
import { StudentForm } from "@/components/student-form";
import { ChargeForm, PaymentForm } from "@/components/fee-forms";
import {
  formatBytes,
  formatDate,
  formatDateTime,
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
  await staffOnly();
  const { id } = await params;

  const [student, programmes] = await Promise.all([
    getStudentDetail(id),
    listProgrammes(),
  ]);

  if (!student) notFound();

  const { fees } = student;

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            Register · <span className="font-mono">{student.studentId}</span>
          </>
        }
        title={student.fullName}
        lede={`${student.programme.code} — ${student.programme.name} · Year ${student.academicYear} · Enrolled ${formatDate(student.enrolledAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusStamp status={student.status} />
            {fees.isOverdue ? <Stamp tone="seal">Arrears</Stamp> : null}
            {fees.inCredit ? <Stamp tone="amber">In credit</Stamp> : null}
          </div>
        }
      />

      {/* ----------------------------------------------------------------- */}
      <Panel className="mb-6">
        <PanelHeader
          title="Fee account"
          hint={
            fees.isOverdue
              ? "This account is in arrears and should be chased."
              : fees.inCredit
                ? "This account is in credit. A refund may be due."
                : fees.nextDueDate
                  ? `Next instalment falls due ${formatDate(fees.nextDueDate)}.`
                  : "Nothing outstanding."
          }
        />
        <div className="grid grid-cols-2 divide-x divide-y divide-rule sm:grid-cols-4">
          <Figure value={formatMoney(fees.charged.toFixed(2))} label="Charged" />
          <Figure value={formatMoney(fees.paid.toFixed(2))} label="Received" tone="sage" />
          <Figure
            value={
              fees.inCredit
                ? formatMoney(fees.balance.negated().toFixed(2))
                : formatMoney(fees.balance.toFixed(2))
            }
            label={fees.inCredit ? "In credit" : "Balance"}
            tone={fees.inCredit ? "amber" : fees.balance.greaterThan(0) ? "neutral" : "sage"}
          />
          <Figure
            value={formatMoney(fees.overdueAmount.toFixed(2))}
            label="Overdue"
            tone={fees.isOverdue ? "seal" : "neutral"}
          />
        </div>
      </Panel>

      {/* The ledger, kept as two columns: debits and credits. --------------- */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Charges" hint="What the student has been billed." />
          {student.charges.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-faint">
              Nothing has been charged to this account.
            </p>
          ) : (
            <Table className="min-w-0">
              <thead>
                <tr>
                  <Th>Description</Th>
                  <Th>Due</Th>
                  <Th numeric>Amount</Th>
                </tr>
              </thead>
              <tbody>
                {student.charges.map((charge) => {
                  return (
                    <tr key={charge.id}>
                      <Td>{charge.description}</Td>
                      <Td className={charge.pastDue ? "text-seal" : "text-ink-soft"}>
                        <span className="font-mono text-xs">
                          {formatDate(charge.dueDate)}
                        </span>
                      </Td>
                      <Td numeric>{formatMoney(charge.amount.toFixed(2))}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Payments" hint="What has been received, and against which reference." />
          {student.payments.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-faint">
              No payment has been received yet.
            </p>
          ) : (
            <Table className="min-w-0">
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Received</Th>
                  <Th numeric>Amount</Th>
                </tr>
              </thead>
              <tbody>
                {student.payments.map((payment) => (
                  <tr key={payment.id}>
                    <Td>
                      <Code>{payment.reference}</Code>
                      <span className="block text-xs text-ink-faint">
                        {payment.method}
                        {payment.note ? ` · ${payment.note}` : ""}
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

      {/* ----------------------------------------------------------------- */}
      <Panel className="mb-6">
        <PanelHeader
          title="Submitted work"
          hint="Uploads against assessments, newest first."
        />
        {student.submissions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-faint">
            This student has not submitted anything yet.
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Assessment</Th>
                <Th>Submitted</Th>
                <Th>File</Th>
                <Th numeric>Attempt</Th>
              </tr>
            </thead>
            <tbody>
              {student.submissions.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <Link
                      href={`/assessments/${s.assessmentId}`}
                      className="font-medium underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                    >
                      {s.assessment.title}
                    </Link>
                    <span className="block text-xs text-ink-faint">
                      {s.assessment.module} · due {formatDateTime(s.assessment.dueAt)}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs">
                      {formatDateTime(s.submittedAt)}
                    </span>
                    {s.isLate ? (
                      <Stamp tone="amber" className="ml-2">
                        Late
                      </Stamp>
                    ) : null}
                  </Td>
                  <Td>
                    <a
                      href={`/api/submissions/${s.id}/file`}
                      className="underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                    >
                      {s.originalName}
                    </a>
                    <span className="block text-xs text-ink-faint">
                      {formatBytes(s.sizeBytes)}
                    </span>
                  </Td>
                  <Td numeric className="text-ink-soft">
                    {s.attempt}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      {/* ----------------------------------------------------------------- */}
      <Panel className="mb-6">
        <PanelHeader
          title="Marks"
          hint="Withheld marks are visible here to staff, and only here."
        />
        {student.results.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-faint">
            No marks have been entered for this student.
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Assessment</Th>
                <Th numeric>Mark</Th>
                <Th>Classification</Th>
                <Th>Released to student</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {student.results.map((r) => {
                const band = classify(r.score);
                return (
                  <tr key={r.id}>
                    <Td>
                      <Link
                        href={`/assessments/${r.assessmentId}`}
                        className="font-medium underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                      >
                        {r.assessment.title}
                      </Link>
                      {r.feedback ? (
                        <span className="mt-0.5 block max-w-md text-xs text-ink-faint">
                          {r.feedback}
                        </span>
                      ) : null}
                    </Td>
                    <Td numeric className={band.passed ? "" : "text-seal"}>
                      {r.score}
                    </Td>
                    <Td className="text-ink-soft">{band.band}</Td>
                    <Td>
                      {r.published ? (
                        <span className="text-sm text-sage">
                          Published {r.publishedAt ? formatDate(r.publishedAt) : ""}
                        </span>
                      ) : (
                        <Stamp tone="seal">Withheld</Stamp>
                      )}
                    </Td>
                    <Td className="text-right">
                      <form action={setResultPublished}>
                        <input type="hidden" name="resultId" value={r.id} />
                        <input
                          type="hidden"
                          name="publish"
                          value={String(!r.published)}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant={r.published ? "danger" : "primary"}
                        >
                          {r.published ? "Withhold" : "Publish"}
                        </Button>
                      </form>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>

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
