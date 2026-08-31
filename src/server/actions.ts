"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/server/action-state";
import { requireRegistry, requireStaff } from "@/lib/session";
import { allocateStudentId } from "@/lib/student-id";
import { parseMoney } from "@/lib/money";
import { summariseFees } from "@/lib/fees";
import { addMonthsDateOnly, dateOnlyToUtc, wallClockToInstant } from "@/lib/time";
import {
  assessmentSchema,
  chargeSchema,
  fieldErrors,
  gradeSchema,
  paymentSchema,
  studentSchema,
} from "@/lib/validation";

/**
 * Mutations.
 *
 * Server Actions are public endpoints. Every one of them re-checks the acting
 * role and re-validates its input, because the fact that our own form behaves
 * says nothing about what will actually be posted here.
 */

/** Unwraps the codes Prisma raises for constraint violations into plain English. */
function explain(error: unknown, fallback: string): ActionState {
  const e = error as { code?: string; meta?: { target?: string[] | string } };
  if (e?.code === "P2002") {
    const target = Array.isArray(e.meta?.target)
      ? e.meta.target.join(", ")
      : String(e.meta?.target ?? "");
    if (target.includes("email")) {
      return {
        ok: false,
        errors: { email: "A student with this email address already exists." },
      };
    }
    if (target.includes("reference")) {
      return {
        ok: false,
        errors: {
          reference:
            "This payment reference has already been recorded. Check the ledger before entering it again.",
        },
      };
    }
    return { ok: false, message: "That record already exists." };
  }
  if (e?.code === "P2003") {
    return { ok: false, message: "That record refers to something that no longer exists." };
  }
  console.error(error);
  return { ok: false, message: fallback };
}

/* -------------------------------------------------------------------------- */
/* Students                                                                    */
/* -------------------------------------------------------------------------- */

export async function enrolStudent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRegistry();

  const parsed = studentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  const input = parsed.data;

  let studentId: string;
  try {
    const created = await prisma.$transaction(async (tx) => {
      const programme = await tx.programme.findUnique({
        where: { id: input.programmeId },
      });
      if (!programme) {
        throw Object.assign(new Error("Unknown programme"), { code: "P2003" });
      }

      // ID allocation and the insert share a transaction: if the insert fails
      // the counter rolls back with it, so no number is burned.
      const student = await tx.student.create({
        data: {
          ...input,
          dateOfBirth: dateOnlyToUtc(input.dateOfBirth)!,
          studentId: await allocateStudentId(tx),
        },
      });

      // Enrolling raises the tuition charge automatically. Registry should not
      // have to remember to bill someone they have just admitted; a student
      // with no charge is invisible to the fees process.
      const today = new Date();
      await tx.feeCharge.create({
        data: {
          studentId: student.id,
          description: `Tuition — ${programme.name} (year ${input.academicYear})`,
          amount: programme.feeAmount,
          // Payable in a month. Clamped to the month end, so enrolling on
          // 31 January is due 28 February rather than rolling into March.
          dueDate: addMonthsDateOnly(today, 1),
        },
      });

      return student;
    });
    studentId = created.id;
  } catch (error) {
    return explain(error, "Could not enrol this student. Try again.");
  }

  revalidatePath("/students");
  revalidatePath("/fees");
  revalidatePath("/");
  redirect(`/students/${studentId}`);
}

export async function updateStudent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRegistry();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "No student selected." };

  const parsed = studentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  try {
    await prisma.student.update({
      where: { id },
      data: {
        ...parsed.data,
        dateOfBirth: dateOnlyToUtc(parsed.data.dateOfBirth)!,
      },
    });
  } catch (error) {
    return explain(error, "Could not save these changes.");
  }

  revalidatePath(`/students/${id}`);
  revalidatePath("/students");
  revalidatePath("/");
  return { ok: true, message: "Record updated." };
}

/* -------------------------------------------------------------------------- */
/* Fees                                                                        */
/* -------------------------------------------------------------------------- */

export async function recordPayment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRegistry();

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  const input = parsed.data;

  const amount = parseMoney(input.amount);
  if (!amount) {
    return { ok: false, errors: { amount: "Enter a positive amount." } };
  }

  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    include: {
      charges: { select: { amount: true, dueDate: true } },
      payments: { select: { amount: true } },
    },
  });
  if (!student) return { ok: false, message: "That student no longer exists." };

  const before = summariseFees(student.charges, student.payments);

  try {
    await prisma.payment.create({
      data: {
        studentId: input.studentId,
        amount,
        // Midday UTC: a payment is recorded against a day, not a moment,
        // and midday keeps it on that day in every timezone it is read in.
        paidAt: new Date(dateOnlyToUtc(input.paidAt)!.getTime() + 12 * 60 * 60 * 1000),
        reference: input.reference,
        method: input.method,
        note: input.note || null,
      },
    });
  } catch (error) {
    return explain(error, "Could not record this payment.");
  }

  revalidatePath("/fees");
  revalidatePath(`/students/${input.studentId}`);
  revalidatePath("/");

  // Overpayment is allowed — sponsors do it constantly — but it is never
  // silent. Saying so at the moment of entry is how a keying error gets
  // caught, rather than surfacing weeks later as a refund request.
  const overpaid = amount.minus(before.balance);
  if (before.balance.greaterThan(0) && overpaid.greaterThan(0)) {
    return {
      ok: true,
      message: `Payment recorded. This clears the balance and leaves £${overpaid.toFixed(2)} in credit — check the amount if that was not intended.`,
    };
  }
  if (before.balance.lessThanOrEqualTo(0)) {
    return {
      ok: true,
      message: `Payment recorded. This account was already settled, so it is now £${amount.plus(before.balance.negated()).toFixed(2)} in credit.`,
    };
  }

  return { ok: true, message: "Payment recorded." };
}

export async function addCharge(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRegistry();

  const parsed = chargeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  const input = parsed.data;

  const amount = parseMoney(input.amount);
  if (!amount) {
    return { ok: false, errors: { amount: "Enter a positive amount." } };
  }

  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    select: { status: true },
  });
  if (!student) return { ok: false, message: "That student no longer exists." };

  // A withdrawn student's account is closed to new charges. What they already
  // owe stands and is still chased — but Registry should not be able to bill
  // someone who has left without going through a readmission first.
  if (student.status === "WITHDRAWN") {
    return {
      ok: false,
      message:
        "This student has withdrawn. Their outstanding balance still stands, but new charges cannot be raised against a closed account.",
    };
  }

  try {
    await prisma.feeCharge.create({
      data: {
        studentId: input.studentId,
        description: input.description,
        amount,
        dueDate: dateOnlyToUtc(input.dueDate)!,
      },
    });
  } catch (error) {
    return explain(error, "Could not raise this charge.");
  }

  revalidatePath("/fees");
  revalidatePath(`/students/${input.studentId}`);
  revalidatePath("/");
  return { ok: true, message: "Charge raised." };
}

/* -------------------------------------------------------------------------- */
/* Assessments and marks — teaching staff only                                 */
/* -------------------------------------------------------------------------- */

/**
 * The ownership check, in one place.
 *
 * A Server Action is a public endpoint: knowing an assessment's id is enough to
 * post to it. So every write below re-establishes that this staff member set
 * this assessment, rather than trusting that the page only rendered their own.
 */
async function ownedAssessment(assessmentId: string, staffId: string) {
  return prisma.assessment.findFirst({
    where: { id: assessmentId, createdById: staffId },
    select: { id: true, programmeId: true },
  });
}

const NOT_YOURS = "That assessment was set by another member of staff.";

export async function createAssessment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();

  const parsed = assessmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  let id: string;
  try {
    const created = await prisma.assessment.create({
      data: {
        title: parsed.data.title,
        module: parsed.data.module,
        // The staff member typed a time on the institution's clock, not the
        // server's. See lib/time.
        dueAt: wallClockToInstant(parsed.data.dueAt)!,
        // Ownership and cohort come from the session and the form, never from
        // a hidden field naming another member of staff.
        createdById: staff.id,
        programmeId: parsed.data.programmeId,
      },
    });
    id = created.id;
  } catch (error) {
    return explain(error, "Could not create this assessment.");
  }

  revalidatePath("/assessments");
  revalidatePath("/me/assessments");
  redirect(`/assessments/${id}`);
}

export async function saveGrade(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();

  const parsed = gradeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  const { assessmentId, studentId, score, feedback } = parsed.data;

  const assessment = await ownedAssessment(assessmentId, staff.id);
  if (!assessment) return { ok: false, message: NOT_YOURS };

  // A mark for a student who was never set this work would be invisible on the
  // marking sheet (which lists the cohort) but perfectly visible on the
  // student's own marksheet. Reject it here rather than create that ghost.
  const inCohort = await prisma.student.findFirst({
    where: { id: studentId, programmeId: assessment.programmeId },
    select: { id: true },
  });
  if (!inCohort) {
    return {
      ok: false,
      message: "That student is not in the cohort this assessment was set for.",
    };
  }

  try {
    await prisma.result.upsert({
      where: { assessmentId_studentId: { assessmentId, studentId } },
      // Re-marking never republishes on its own. If a mark changes after
      // release, staff decide again whether the student should see it.
      update: {
        score,
        feedback: feedback || null,
        markedAt: new Date(),
        published: false,
        publishedAt: null,
      },
      create: {
        assessmentId,
        studentId,
        score,
        feedback: feedback || null,
      },
    });
  } catch (error) {
    return explain(error, "Could not save this mark.");
  }

  revalidatePath(`/assessments/${assessmentId}`);
  revalidatePath("/assessments");
  revalidatePath("/me");
  return { ok: true, message: "Mark saved and withheld until you publish it." };
}

export async function setResultPublished(formData: FormData) {
  const staff = await requireStaff();

  const resultId = String(formData.get("resultId") ?? "");
  const publish = String(formData.get("publish") ?? "") === "true";
  if (!resultId) return;

  // Scoped by the assessment's owner, so releasing somebody else's mark
  // updates nothing rather than succeeding quietly.
  const { count } = await prisma.result.updateMany({
    where: { id: resultId, assessment: { createdById: staff.id } },
    data: {
      published: publish,
      publishedAt: publish ? new Date() : null,
    },
  });
  if (count === 0) return;

  const result = await prisma.result.findUniqueOrThrow({
    where: { id: resultId },
    select: { assessmentId: true, studentId: true },
  });

  revalidatePath(`/assessments/${result.assessmentId}`);
  revalidatePath("/assessments");
  revalidatePath("/me");
  revalidatePath("/me/assessments");
}

/** Publishes every mark on an assessment at once — the exam-board moment. */
export async function publishAllResults(formData: FormData) {
  const staff = await requireStaff();

  const assessmentId = String(formData.get("assessmentId") ?? "");
  if (!assessmentId) return;
  if (!(await ownedAssessment(assessmentId, staff.id))) return;

  await prisma.result.updateMany({
    where: { assessmentId, published: false },
    data: { published: true, publishedAt: new Date() },
  });

  revalidatePath(`/assessments/${assessmentId}`);
  revalidatePath("/assessments");
  revalidatePath("/me");
}
