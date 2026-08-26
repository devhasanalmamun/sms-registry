import { z } from "zod";
import { EnrolmentStatus } from "@/generated/prisma/enums";

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

const isoDate = z
  .string()
  .trim()
  .min(1, "Required")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date");

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
  dateOfBirth: isoDate.refine((v) => {
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
  paidAt: isoDate,
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
  dueDate: isoDate,
});

export const assessmentSchema = z.object({
  title: z.string().trim().min(2, "Enter a title").max(140),
  module: z.string().trim().min(2, "Enter a module").max(80),
  dueAt: z
    .string()
    .trim()
    .min(1, "Set a deadline")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date and time"),
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
