import { z } from "zod";
import { EnrolmentStatus } from "@/generated/prisma/enums";
import { dateOnlyToUtc, wallClockToInstant } from "@/lib/time";

/**
 * Every mutation validates here before it reaches Prisma. Server Actions are
 * public HTTP endpoints — the fact that our own form is well behaved says
 * nothing about what will actually be posted to them.
 */

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 1250 or 1250.50")
  .refine((v) => Number(v) > 0, "Amount must be greater than zero");

/**
 * A calendar date, exactly as an <input type="date"> submits it.
 *
 * Deliberately strict. Accepting "anything Date.parse understands" let a full
 * ISO timestamp through, which the actions then concatenated another time onto
 * ("2026-08-27T10:00:00Z" + "T12:00:00Z") and handed to Prisma as an Invalid
 * Date. Pinning the shape here is what makes the parse downstream total.
 */
const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date as YYYY-MM-DD")
  .refine((v) => dateOnlyToUtc(v) !== null, "That date does not exist");

/** A local date and time, as an <input type="datetime-local"> submits it. */
const localDateTime = z
  .string()
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
    "Enter a date and time",
  )
  .refine((v) => wallClockToInstant(v) !== null, "That date and time does not exist");

export const studentSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter the student's full name")
    .max(120, "Name is too long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(180),
  dateOfBirth: dateOnly.refine((v) => {
    const dob = new Date(v);
    const age =
      (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 15 && age <= 100;
  }, "Date of birth looks wrong — students are normally 15 or older"),
  programmeId: z.string().min(1, "Choose a programme"),
  academicYear: z.coerce
    .number()
    .int()
    .min(1, "Academic year must be 1 or more")
    .max(7, "Academic year looks wrong"),
  status: z.enum(EnrolmentStatus),
});

export const paymentSchema = z.object({
  studentId: z.string().min(1),
  amount: moneyString,
  paidAt: dateOnly,
  reference: z
    .string()
    .trim()
    .min(3, "Enter the bank or receipt reference")
    .max(60),
  method: z.string().trim().min(1).max(40),
  note: z.string().trim().max(280).optional().or(z.literal("")),
});

export const chargeSchema = z.object({
  studentId: z.string().min(1),
  description: z.string().trim().min(2, "Describe the charge").max(120),
  amount: moneyString,
  dueDate: dateOnly,
});

export const assessmentSchema = z.object({
  title: z.string().trim().min(2, "Enter a title").max(140),
  module: z.string().trim().min(2, "Enter a module").max(80),
  dueAt: localDateTime,
});

export const gradeSchema = z.object({
  assessmentId: z.string().min(1),
  studentId: z.string().min(1),
  score: z.coerce
    .number()
    .int("Enter a whole number")
    .min(0, "Marks run from 0 to 100")
    .max(100, "Marks run from 0 to 100"),
  feedback: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type StudentInput = z.infer<typeof studentSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ChargeInput = z.infer<typeof chargeSchema>;
export type AssessmentInput = z.infer<typeof assessmentSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;

/** Turns a ZodError into `{ field: message }` for rendering next to inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
