import Link from "next/link";
import { staffOnly } from "@/lib/guards";
import { listStudents } from "@/server/queries";
import {
  Code,
  EmptyState,
  Figure,
  LinkButton,
  PageHeader,
  Panel,
  PanelHeader,
  Stamp,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { StatusStamp } from "@/components/status-stamp";
import { formatDate, formatMoney } from "@/lib/format";
import { Prisma } from "@/generated/prisma/client";
import { ZERO } from "@/lib/money";

export const dynamic = "force-dynamic";

type Filter = "all" | "overdue" | "outstanding" | "credit" | "settled";

const filters: { key: Filter; label: string; hint: string }[] = [
  { key: "all", label: "All accounts", hint: "Every student on the register" },
  { key: "overdue", label: "In arrears", hint: "Past a due date and still owing" },
  { key: "outstanding", label: "Owing", hint: "A balance, but nothing past due yet" },
  { key: "credit", label: "In credit", hint: "Paid more than they were charged" },
  { key: "settled", label: "Settled", hint: "Nothing outstanding" },
];

/**
 * The fees ledger.
 *
 * The distinction the whole page turns on: "owing" and "in arrears" are not
 * the same thing. Most students owe money for most of the year — that is how
 * instalments work. Only the ones past a due date need chasing, and only those
 * are allowed to use the seal colour.
 */
export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await staffOnly();
  const params = await searchParams;
  const filter = (
    typeof params.filter === "string" &&
    filters.some((f) => f.key === params.filter)
      ? params.filter
      : "all"
  ) as Filter;

  const all = await listStudents();

  const rows = all.filter((s) => {
    switch (filter) {
      case "overdue":
        return s.fees.isOverdue;
      case "outstanding":
        return s.fees.balance.greaterThan(0) && !s.fees.isOverdue;
      case "credit":
        return s.fees.inCredit;
      case "settled":
        return s.fees.balance.isZero();
      default:
        return true;
    }
  });

  // Summed as Decimal, not as JavaScript numbers. These are the figures a
  // bursar reconciles against a bank statement; the rest of the codebase is
  // careful about this and the summary line has no business being the one
  // place that quietly converts money to floats.
  const totals = all.reduce(
    (acc, s) => ({
      charged: acc.charged.plus(s.fees.charged),
      paid: acc.paid.plus(s.fees.paid),
      outstanding: acc.outstanding.plus(
        Prisma.Decimal.max(ZERO, s.fees.balance),
      ),
      overdue: acc.overdue.plus(s.fees.overdueAmount),
      credit: acc.credit.plus(Prisma.Decimal.max(ZERO, s.fees.balance.negated())),
    }),
    { charged: ZERO, paid: ZERO, outstanding: ZERO, overdue: ZERO, credit: ZERO },
  );

  const collected = totals.charged.greaterThan(0)
    ? totals.paid.dividedBy(totals.charged).times(100)
    : ZERO;

  return (
    <>
      <PageHeader
        eyebrow="Bursary"
        title="Fees"
        lede="Charges raised, payments received, and who is actually behind. A balance is not arrears until a charge has passed its due date."
      />

      <Panel className="mb-6">
        <PanelHeader
          title="Position across the register"
          hint={`${collected.toFixed(1)}% of everything charged has been received.`}
        />
        <div className="grid grid-cols-2 divide-x divide-y divide-rule sm:grid-cols-5">
          <Figure value={formatMoney(totals.charged.toFixed(2))} label="Charged" />
          <Figure value={formatMoney(totals.paid.toFixed(2))} label="Received" tone="sage" />
          <Figure value={formatMoney(totals.outstanding.toFixed(2))} label="Outstanding" />
          <Figure
            value={formatMoney(totals.overdue.toFixed(2))}
            label="In arrears"
            tone={totals.overdue.greaterThan(0) ? "seal" : "neutral"}
          />
          <Figure
            value={formatMoney(totals.credit.toFixed(2))}
            label="Held in credit"
            tone={totals.credit.greaterThan(0) ? "amber" : "neutral"}
          />
        </div>
      </Panel>

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filter accounts">
        {filters.map((f) => (
          <LinkButton
            key={f.key}
            href={f.key === "all" ? "/fees" : `/fees?filter=${f.key}`}
            size="sm"
            variant={filter === f.key ? "primary" : "secondary"}
            title={f.hint}
          >
            {f.label}
          </LinkButton>
        ))}
      </nav>

      <Panel>
        {rows.length === 0 ? (
          <EmptyState title="No accounts in this state.">
            {filter === "overdue"
              ? "Nobody is past a due date. That is the state you want this list in."
              : "Try another filter."}
          </EmptyState>
        ) : (
          <>
            <p className="border-b border-rule px-4 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
              {rows.length} {rows.length === 1 ? "account" : "accounts"} ·{" "}
              {filters.find((f) => f.key === filter)?.hint}
            </p>
            <Table>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Standing</Th>
                  <Th>Next due</Th>
                  <Th numeric>Charged</Th>
                  <Th numeric>Received</Th>
                  <Th numeric>Balance</Th>
                  <Th numeric>Overdue</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-paper">
                    <Td>
                      <Link
                        href={`/students/${s.id}`}
                        className="font-medium underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                      >
                        {s.fullName}
                      </Link>
                      <Code className="ml-2">{s.studentId}</Code>
                      <span className="block text-xs text-ink-faint">
                        {s.programme.code}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusStamp status={s.status} />
                        {s.fees.inCredit ? <Stamp tone="amber">Credit</Stamp> : null}
                      </div>
                    </Td>
                    <Td className="font-mono text-xs text-ink-soft">
                      {s.fees.nextDueDate ? formatDate(s.fees.nextDueDate) : "—"}
                    </Td>
                    <Td numeric className="text-ink-soft">
                      {formatMoney(s.fees.charged.toFixed(2))}
                    </Td>
                    <Td numeric className="text-sage">
                      {formatMoney(s.fees.paid.toFixed(2))}
                    </Td>
                    <Td numeric className={s.fees.inCredit ? "text-amber" : ""}>
                      {formatMoney(s.fees.balance.toFixed(2))}
                    </Td>
                    <Td
                      numeric
                      className={s.fees.isOverdue ? "font-medium text-seal" : "text-ink-faint"}
                    >
                      {s.fees.isOverdue
                        ? formatMoney(s.fees.overdueAmount.toFixed(2))
                        : "—"}
                    </Td>
                    <Td className="text-right">
                      <LinkButton href={`/students/${s.id}`} size="sm">
                        Take payment
                      </LinkButton>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Panel>
    </>
  );
}
