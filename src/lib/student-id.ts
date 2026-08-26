import type { Prisma } from "@/generated/prisma/client";

/**
 * Student ID allocation, e.g. SMS-2025-0001.
 *
 * Registry staff read these out over the phone, so they are sequential and
 * year-scoped rather than random. That makes allocation a shared-counter
 * problem: two admissions officers clicking "Enrol" at the same moment must
 * not both be handed SMS-2025-0042.
 *
 * The counter therefore lives in its own table and is incremented inside the
 * caller's transaction with an atomic `update`, which takes a row lock for the
 * duration. Taking `MAX(studentId) + 1` would race, and would also reuse an ID
 * after a deletion — an ID that may already be printed on a student card.
 */

export const STUDENT_ID_PREFIX = "SMS";

export function formatStudentId(year: number, sequence: number): string {
  return `${STUDENT_ID_PREFIX}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function parseStudentId(
  value: string,
): { year: number; sequence: number } | null {
  const match = /^SMS-(\d{4})-(\d{4,})$/.exec(value.trim().toUpperCase());
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

/**
 * Allocates the next ID for `year`. MUST be called inside a transaction that
 * also creates the student, so that a failed insert rolls the counter back.
 */
export async function allocateStudentId(
  tx: Prisma.TransactionClient,
  year: number = new Date().getFullYear(),
): Promise<string> {
  const sequence = await tx.studentIdSequence.upsert({
    where: { year },
    create: { year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
    select: { lastValue: true },
  });

  return formatStudentId(year, sequence.lastValue);
}
