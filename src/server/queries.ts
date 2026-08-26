import "server-only";
import { prisma } from "@/lib/db";
import type { EnrolmentStatus } from "@/generated/prisma/enums";
import { summariseFees, type FeeSummary } from "@/lib/fees";
import { classify } from "@/lib/grading";

/**
 * Read model for the Registry.
 *
 * Everything that derives money or decides what a student may see lives here,
 * so there is exactly one implementation of each rule. In particular
 * `getStudentMarksheet` filters on `published` in the database query itself —
 * an unpublished mark is never loaded, so it cannot leak into a payload, a log
 * line, or a React server component's serialised props.
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
              { programme: { name: { contains: search, mode: "insensitive" } } },
              { programme: { code: { contains: search, mode: "insensitive" } } },
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

export async function getStudentDetail(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      programme: true,
      charges: { orderBy: { dueDate: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
      submissions: {
        include: { assessment: true },
        orderBy: { submittedAt: "desc" },
      },
      results: {
        include: { assessment: true },
        orderBy: { markedAt: "desc" },
      },
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
  const [assessments, submissions, published] = await Promise.all([
    prisma.assessment.findMany({ orderBy: { dueAt: "asc" } }),
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

export async function listAssessments() {
  const assessments = await prisma.assessment.findMany({
    orderBy: { dueAt: "desc" },
    include: {
      submissions: { select: { id: true, isLate: true } },
      results: { select: { id: true, published: true } },
    },
  });

  // The same cohort the marking sheet lists, so "4 of 6" on this page and the
  // rows on that one cannot disagree. Withdrawn students are excluded: they
  // are not expected to submit anything.
  const expectedCohort = await prisma.student.count({
    where: { status: { in: ["ENROLLED", "DEFERRED", "COMPLETED"] } },
  });

  const now = Date.now();

  return assessments.map((a) => ({
    ...a,
    closed: a.dueAt.getTime() < now,
    counts: {
      expected: expectedCohort,
      submitted: a.submissions.length,
      late: a.submissions.filter((s) => s.isLate).length,
      marked: a.results.length,
      published: a.results.filter((r) => r.published).length,
      awaitingMark: a.submissions.length - a.results.length,
    },
  }));
}

/**
 * The marking sheet: every student who could submit, alongside their
 * submission and mark. Students with no submission still appear — a missing
 * submission is exactly what a marker needs to see.
 */
export async function getAssessmentDetail(id: string) {
  const assessment = await prisma.assessment.findUnique({ where: { id } });
  if (!assessment) return null;

  const [students, submissions, results] = await Promise.all([
    prisma.student.findMany({
      where: { status: { in: ["ENROLLED", "DEFERRED", "COMPLETED"] } },
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
 * The dashboard answers one question: what does Registry need to act on today?
 */
export async function getRegistryOverview() {
  const [students, assessments, unpublished] = await Promise.all([
    prisma.student.findMany({
      include: {
        programme: { select: { code: true, name: true } },
        charges: { select: { amount: true, dueDate: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { studentId: "asc" },
    }),
    prisma.assessment.findMany({
      include: {
        submissions: {
          include: { student: { select: { fullName: true, studentId: true } } },
        },
        results: { select: { id: true, published: true, studentId: true } },
      },
      orderBy: { dueAt: "asc" },
    }),
    prisma.result.findMany({
      where: { published: false },
      include: {
        assessment: { select: { id: true, title: true } },
        student: { select: { fullName: true, studentId: true } },
      },
      orderBy: { markedAt: "asc" },
    }),
  ]);

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
    .sort((a, b) => Number(b.fees.overdueAmount) - Number(a.fees.overdueAmount));

  const lateSubmissions = assessments.flatMap((a) =>
    a.submissions
      .filter((s) => s.isLate)
      .map((s) => ({ assessment: a, submission: s })),
  );

  const awaitingMark = assessments.flatMap((a) => {
    const marked = new Set(a.results.map((r) => r.studentId));
    return a.submissions
      .filter((s) => !marked.has(s.studentId))
      .map((s) => ({ assessment: a, submission: s }));
  });

  const now = new Date();
  const closingSoon = assessments.filter(
    (a) =>
      a.dueAt.getTime() > now.getTime() &&
      a.dueAt.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000,
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
    lateSubmissions,
    awaitingMark,
    unpublished,
    closingSoon,
  };
}

export function listProgrammes() {
  return prisma.programme.findMany({ orderBy: { code: "asc" } });
}
