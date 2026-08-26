import { Prisma } from "@/generated/prisma/client";

/**
 * Money handling — server side only.
 *
 * Amounts are Decimal(10,2) in Postgres and Prisma.Decimal in memory. They are
 * converted to strings at the Server/Client Component boundary (Decimal
 * instances are not serialisable as props) and formatted with
 * `formatMoney` from ./format.
 *
 * Floats are never used. A fees ledger that is 1p out is a ledger a Registry
 * team cannot reconcile against a bank statement.
 */

export const ZERO = new Prisma.Decimal(0);

export type DecimalLike = Prisma.Decimal | string | number;

export function toDecimal(value: DecimalLike): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function sumDecimals(values: DecimalLike[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((acc, v) => acc.plus(toDecimal(v)), ZERO);
}

/** Serialise for a Client Component prop. */
export function decimalToString(value: DecimalLike): string {
  return toDecimal(value).toFixed(2);
}

/**
 * Parse a money field submitted by a form. Returns null when the input is not
 * a valid positive amount with at most two decimal places, so the caller can
 * raise a field-level error instead of writing nonsense into the ledger.
 */
export function parseMoney(input: string): Prisma.Decimal | null {
  const cleaned = input.trim().replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = new Prisma.Decimal(cleaned);
  return value.greaterThan(0) ? value : null;
}
