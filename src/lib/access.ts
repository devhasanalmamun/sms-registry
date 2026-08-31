import type { Session } from "@/lib/session";

/**
 * Who may see what.
 *
 * These are the three rules the role split turns on, written as pure functions
 * so they can be tested directly rather than inferred from a page that happens
 * to render the right thing. Everywhere they are enforced — a query's `where`,
 * a route handler, a Server Action — defers to these.
 *
 * They take the narrowest shape they need rather than whole Prisma models, so a
 * caller can select two columns instead of a row.
 */

/** An assessment belongs to the staff member who set it. Nobody else marks it. */
export function ownsAssessment(
  session: Session,
  assessment: { createdById: string },
) {
  return session.role === "staff" && session.staffId === assessment.createdById;
}

/**
 * An assessment reaches exactly one cohort: the students enrolled on its
 * programme. This is the difference between "you have not submitted" and "this
 * was never set for you".
 */
export function isInCohort(
  student: { programmeId: string },
  assessment: { programmeId: string },
) {
  return student.programmeId === assessment.programmeId;
}

/**
 * Reading a submitted file.
 *
 * A student may read their own work. A staff member may read work handed in
 * against an assessment they set. The Registry office may read none of it —
 * coursework is not their business, and the fact that they can see a student's
 * record does not extend to the student's essays.
 */
export function canReadSubmission(
  session: Session,
  submission: { studentId: string; assessment: { createdById: string } },
) {
  if (session.role === "student") return session.studentId === submission.studentId;
  if (session.role === "staff") return ownsAssessment(session, submission.assessment);
  return false;
}
