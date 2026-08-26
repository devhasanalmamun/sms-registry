import { Prisma } from "@/generated/prisma/client";
import { sumDecimals, toDecimal, ZERO, type DecimalLike } from "@/lib/money";

/**
 * Fee derivation.
 *
 * The balance is never stored. It is always charges minus payments, computed
 * from the ledger, because a stored balance is a cache and caches drift — and
 * a Registry team that cannot trust the balance column stops using the system.
 *
 * "Overdue" is deliberately *not* the same as "owes money". A student who owes
 * £3,000 due next term is in good standing; a student who owes £50 that fell
 * due last month is the one Registry needs to chase. Overdue therefore means:
 * there is an outstanding balance AND at least one charge is already past its
 * due date. Payments are applied oldest-charge-first, the way a bursary office
 * actually allocates them.
 */

export type ChargeLike = { amount: DecimalLike; dueDate: Date | string };
export type PaymentLike = { amount: DecimalLike };

export type FeeSummary = {
  /** Total ever charged. */
  charged: Prisma.Decimal;
  /** Total ever paid. */
  paid: Prisma.Decimal;
  /** charged - paid. Negative means the student is in credit (overpaid). */
  balance: Prisma.Decimal;
  /** The part of the balance attributable to charges already past due. */
  overdueAmount: Prisma.Decimal;
  isOverdue: boolean;
  /** True when payments exceed charges — surfaced, never silently swallowed. */
  inCredit: boolean;
  /** Earliest unpaid charge's due date, for "due in 5 days" style prompts. */
  nextDueDate: Date | null;
};

export function summariseFees(
  charges: ChargeLike[],
  payments: PaymentLike[],
  now: Date = new Date(),
): FeeSummary {
  const charged = sumDecimals(charges.map((c) => c.amount));
  const paid = sumDecimals(payments.map((p) => p.amount));
  const balance = charged.minus(paid);

  // Apply the money received against charges oldest-first; whatever is still
  // uncovered and already past its due date is the overdue amount.
  const ordered = [...charges].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  let remaining = paid;
  let overdueAmount = ZERO;
  let nextDueDate: Date | null = null;

  for (const charge of ordered) {
    const amount = toDecimal(charge.amount);
    const covered = Prisma.Decimal.min(remaining, amount);
    remaining = remaining.minus(covered);
    const uncovered = amount.minus(covered);

    if (uncovered.greaterThan(0)) {
      const due = new Date(charge.dueDate);
      if (nextDueDate === null) nextDueDate = due;
      if (due.getTime() < now.getTime()) {
        overdueAmount = overdueAmount.plus(uncovered);
      }
    }
  }

  return {
    charged,
    paid,
    balance,
    overdueAmount,
    isOverdue: overdueAmount.greaterThan(0),
    inCredit: balance.lessThan(0),
    nextDueDate,
  };
}

/** Shape handed to Client Components — plain strings, no Decimal instances. */
export type SerialisedFeeSummary = {
  charged: string;
  paid: string;
  balance: string;
  overdueAmount: string;
  isOverdue: boolean;
  inCredit: boolean;
  nextDueDate: string | null;
};

export function serialiseFeeSummary(s: FeeSummary): SerialisedFeeSummary {
  return {
    charged: s.charged.toFixed(2),
    paid: s.paid.toFixed(2),
    balance: s.balance.toFixed(2),
    overdueAmount: s.overdueAmount.toFixed(2),
    isOverdue: s.isOverdue,
    inCredit: s.inCredit,
    nextDueDate: s.nextDueDate ? s.nextDueDate.toISOString() : null,
  };
}
