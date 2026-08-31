import "server-only";
import { prisma } from "@/lib/db";
import type { EnrolmentStatus } from "@/generated/prisma/enums";
import { summariseFees, type FeeSummary } from "@/lib/fees";
import { classify } from "@/lib/grading";
import { ACTIVE_STATUSES, cohortWhere } from "@/lib/access";

/**
 * The read model.
 *
 * Everything that derives money or decides who may see what lives here, so
 * there is exactly one implementation of each rule. Two of those rules are
 * enforced in the database query itself rather than in a component:
 *
 *   * `getStudentMarksheet` filters on `published`, so an unpublished mark is
 *     never loaded — it cannot leak into a payload, a log line, or a server
 *     component's serialised props.
 *   * Assessment queries filter on the cohort and, for staff, on ownership. A
 *     lecturer's marking sheet lists the students the work was set for, and
 *     nobody else.
 */

export type StudentFilters = {
  search?: string;
  programmeId?: string;
  status?: EnrolmentStatus | "ALL";
  /** Restrict to accounts that are actually in arrears. */
  overdueOnly?: boolean;
};

export type StudentRow = {
  id: string;
  studentId: string;
  fullName: string;
  email: string;
  academicYear: number;
  status: EnrolmentStatus;
  programme: { id: string; code: string; name: string };
  fees: FeeSummary;
};

export async function listStudents(
  filters: StudentFilters = {},
): Promise<StudentRow[]> {
  const search = filters.search?.trim();

  const students = await prisma.student.findMany({
    where: {
      ...(filters.programmeId ? { programmeId: filters.programmeId } : {}),
      ...(filters.status && filters.status !== "ALL"
        ? { status: filters.status }
        : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { studentId: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              {
                programme: { name: { contains: search, mode: "insensitive" } },
              },
              {
                programme: { code: { contains: search, mode: "insensitive" } },
              },
            ],
          }
        : {}),
    },
    include: {
      programme: { select: { id: true, code: true, name: true } },
      charges: { select: { amount: true, dueDate: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { studentId: "asc" },
  });

  const rows = students.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    fullName: s.fullName,
    email: s.email,
    academicYear: s.academicYear,
    status: s.status,
    programme: s.programme,
    fees: summariseFees(s.charges, s.payments),
  }));

  return filters.overdueOnly ? rows.filter((r) => r.fees.isOverdue) : rows;
}

/**
 * The Registry's view of one student: their record and their ledger.
 *
 * No submissions and no marks. Those are the teaching side's, and a registrar
 * has no authority over either — showing them here would invite a phone call
 * ("can you just release Hassan's mark?") that this office cannot action.
 */
export async function getStudentDetail(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      programme: true,
      charges: { orderBy: { dueDate: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });

  if (!student) return null;

  const now = new Date();
  const fees = summariseFees(student.charges, student.payments, now);

  return {
    ...student,
    fees,
    // Flags are derived here, not in the component. A Server Component must be
    // pure, and "is this charge overdue" is a question about the data anyway.
    charges: student.charges.map((charge) => ({
      ...charge,
      pastDue:
        charge.dueDate.getTime() < now.getTime() && fees.balance.greaterThan(0),
    })),
  };
}

/**
 * The student's own marksheet. Unpublished results are excluded at the query,
 * not at the component.
 */
export async function getStudentMarksheet(studentId: string) {
  const results = await prisma.result.findMany({
    where: { studentId, published: true },
    include: { assessment: true },
    orderBy: { publishedAt: "desc" },
  });

  return results.map((r) => ({
    id: r.id,
    score: r.score,
    feedback: r.feedback,
    publishedAt: r.publishedAt,
    assessment: r.assessment,
    classification: classify(r.score),
  }));
}

/**
 * Assessments from the student's point of view: what is open, what they have
 * submitted, and whether a mark has been released. Deliberately reports "not
 * released yet" for work that has been marked but withheld — silence would
 * read as "they lost my paper", which generates a phone call to Registry.
 */
export async function getStudentAssessments(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { programmeId: true },
  });
  if (!student) return [];

  const [assessments, submissions, published] = await Promise.all([
    // Only work set for this student's programme. An assessment for another
    // cohort is not "closed" or "not submitted" to them — it does not exist.
    prisma.assessment.findMany({
      where: { programmeId: student.programmeId },
      include: { createdBy: { select: { fullName: true, title: true } } },
      orderBy: { dueAt: "asc" },
    }),
    prisma.submission.findMany({ where: { studentId } }),
    prisma.result.findMany({
      where: { studentId, published: true },
      select: { assessmentId: true, score: true },
    }),
  ]);

  const submissionBy = new Map(submissions.map((s) => [s.assessmentId, s]));
  const scoreBy = new Map(published.map((r) => [r.assessmentId, r.score]));

  const now = Date.now();

  return assessments.map((assessment) => ({
    assessment,
    closed: assessment.dueAt.getTime() < now,
    submission: submissionBy.get(assessment.id) ?? null,
    releasedScore: scoreBy.get(assessment.id) ?? null,
  }));
}

/**
 * A staff member's own assessments.
 *
 * Scoped to `createdById`, so this is also the ownership boundary: a lecturer
 * cannot list, open, or mark work somebody else set.
 */
export async function listAssessmentsFor(staffId: string) {
  const assessments = await prisma.assessment.findMany({
    where: { createdById: staffId },
    orderBy: { dueAt: "desc" },
    include: {
      programme: { select: { id: true, code: true, name: true } },
      submissions: { select: { id: true, isLate: true, studentId: true } },
      results: { select: { id: true, published: true, studentId: true } },
    },
  });

  // The expected cohort is per programme, so it is counted per programme —
  // once each, not once per assessment.
  const cohorts = await prisma.student.groupBy({
    by: ["programmeId"],
    where: { status: { in: [...ACTIVE_STATUSES] } },
    _count: { _all: true },
  });
  const cohortSize = new Map(
    cohorts.map((c) => [c.programmeId, c._count._all]),
  );

  const now = Date.now();

  return assessments.map((a) => {
    const marked = new Set(a.results.map((r) => r.studentId));
    return {
      ...a,
      closed: a.dueAt.getTime() < now,
      counts: {
        // Same cohort rule as the marking sheet, so "4 of 6" here and the rows
        // there cannot disagree.
        expected: cohortSize.get(a.programmeId) ?? 0,
        submitted: a.submissions.length,
        late: a.submissions.filter((s) => s.isLate).length,
        marked: a.results.length,
        published: a.results.filter((r) => r.published).length,
        // Submissions with no mark yet. Subtracting one count from the other
        // goes negative as soon as someone who did not submit is given a mark.
        awaitingMark: a.submissions.filter((s) => !marked.has(s.studentId))
          .length,
        withheld: a.results.filter((r) => !r.published).length,
      },
    };
  });
}

/**
 * The marking sheet: every student the work was set for, alongside their
 * submission and mark. Students with no submission still appear — a missing
 * submission is exactly what a marker needs to see.
 *
 * `staffId` is the ownership check, done in the same query that fetches the
 * record: a staff member who did not set this assessment gets null, and the
 * page redirects. Passing null (the caller has already established the viewer
 * is not staff) skips the check.
 */
export async function getAssessmentDetail(id: string, staffId: string | null) {
  const assessment = await prisma.assessment.findFirst({
    where: { id, ...(staffId ? { createdById: staffId } : {}) },
    include: {
      programme: { select: { id: true, code: true, name: true } },
      createdBy: { select: { fullName: true, title: true } },
    },
  });
  if (!assessment) return null;

  const [students, submissions, results] = await Promise.all([
    // The cohort, not the institution: only students on this assessment's
    // programme were ever set this work.
    prisma.student.findMany({
      where: cohortWhere(assessment.programmeId),
      include: { programme: { select: { code: true } } },
      orderBy: { studentId: "asc" },
    }),
    prisma.submission.findMany({ where: { assessmentId: id } }),
    prisma.result.findMany({ where: { assessmentId: id } }),
  ]);

  const submissionBy = new Map(submissions.map((s) => [s.studentId, s]));
  const resultBy = new Map(results.map((r) => [r.studentId, r]));

  const rows = students.map((student) => {
    const result = resultBy.get(student.id) ?? null;
    return {
      student,
      submission: submissionBy.get(student.id) ?? null,
      result,
      classification: result ? classify(result.score) : null,
    };
  });

  return { assessment, rows, closed: assessment.dueAt.getTime() < Date.now() };
}

/**
 * The Registry dashboard answers one question: what does the Registry office
 * need to act on today?
 *
 * Enrolment and money, and nothing else. Marking queues and withheld results
 * used to be summarised here; they belong to teaching staff, who are the only
 * people who can act on them, and a dashboard listing work you are not allowed
 * to do is just noise.
 */
export async function getRegistryOverview() {
  const students = await prisma.student.findMany({
    include: {
      programme: { select: { code: true, name: true } },
      charges: { select: { amount: true, dueDate: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { studentId: "asc" },
  });

  const withFees = students.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    fullName: s.fullName,
    status: s.status,
    programme: s.programme,
    fees: summariseFees(s.charges, s.payments),
  }));

  const overdue = withFees
    .filter((s) => s.fees.isOverdue)
    .sort(
      (a, b) => Number(b.fees.overdueAmount) - Number(a.fees.overdueAmount),
    );

  return {
    counts: {
      enrolled: withFees.filter((s) => s.status === "ENROLLED").length,
      deferred: withFees.filter((s) => s.status === "DEFERRED").length,
      withdrawn: withFees.filter((s) => s.status === "WITHDRAWN").length,
      completed: withFees.filter((s) => s.status === "COMPLETED").length,
      total: withFees.length,
      inCredit: withFees.filter((s) => s.fees.inCredit).length,
    },
    overdue,
  };
}

export function listProgrammes() {
  return prisma.programme.findMany({ orderBy: { code: "asc" } });
}

export function listStaff() {
  return prisma.staffMember.findMany({ orderBy: { staffId: "asc" } });
}
