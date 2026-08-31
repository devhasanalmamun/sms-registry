import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Role separation.
 *
 * Three roles, because the institution has three jobs and they do not overlap:
 *
 *   registry  enrolment and the fees ledger
 *   staff     assessments, marking, and releasing results
 *   student   their own record
 *
 * Registry and teaching staff are genuinely different people with different
 * authority. A registrar cannot set an assessment or release a mark; a lecturer
 * cannot see the ledger. Collapsing them into one "staff" flag — which is what
 * this file used to do — models an institution where the person chasing unpaid
 * fees also decides who passed.
 *
 * The brief allows a simple role toggle in place of authentication. The
 * important part is *where* the toggle is read: this module runs on the server
 * only, and every query that returns role-restricted data derives its filters
 * from here. Switching role in the UI does not merely hide data — the data is
 * never fetched, so it never reaches the browser at all.
 *
 * Both actors are resolved against the database rather than taken at face value
 * from the cookie, so a cookie naming someone who no longer exists degrades to
 * the Registry view instead of erroring.
 *
 * Swapping this for real authentication means replacing the two lookups below
 * with calls into the auth provider; nothing downstream changes.
 */

export const ROLE_COOKIE = "sms_role";

export type Role = "registry" | "staff" | "student";

export type Session =
  | { role: "registry"; staffId: null; studentId: null }
  | { role: "staff"; staffId: string; studentId: null }
  | { role: "student"; staffId: null; studentId: string };

async function roleCookie() {
  const store = await cookies();
  return store.get(ROLE_COOKIE)?.value ?? "registry";
}

/**
 * The student currently being viewed as, or null for any other role — or when
 * the cookie points at a record that has since been deleted.
 */
export const getActingStudent = cache(async () => {
  const raw = await roleCookie();
  if (!raw.startsWith("student:")) return null;

  const id = raw.slice("student:".length).trim();
  if (!id) return null;

  return prisma.student.findUnique({
    where: { id },
    include: { programme: true },
  });
});

/** The staff member currently being viewed as, or null for any other role. */
export const getActingStaff = cache(async () => {
  const raw = await roleCookie();
  if (!raw.startsWith("staff:")) return null;

  const id = raw.slice("staff:".length).trim();
  if (!id) return null;

  return prisma.staffMember.findUnique({ where: { id } });
});

export async function getSession(): Promise<Session> {
  const [student, staff] = await Promise.all([
    getActingStudent(),
    getActingStaff(),
  ]);

  if (student) return { role: "student", staffId: null, studentId: student.id };
  if (staff) return { role: "staff", staffId: staff.id, studentId: null };
  return { role: "registry", staffId: null, studentId: null };
}

/**
 * Guards for code paths that must have a particular actor. These throw rather
 * than returning null so a caller cannot accidentally continue with an
 * undefined actor. Pages use the redirecting guards in lib/guards instead.
 */

export async function requireStudent() {
  const student = await getActingStudent();
  if (!student) {
    throw new Error(
      "No student selected. Use the role switcher to view the site as a student.",
    );
  }
  return student;
}

/** Teaching staff: assessments, marking, releasing results. */
export async function requireStaff() {
  const staff = await getActingStaff();
  if (!staff) {
    throw new Error(
      "Only teaching staff can set assessments, enter marks, or release results.",
    );
  }
  return staff;
}

/** The Registry office: enrolment and the fees ledger. */
export async function requireRegistry() {
  const session = await getSession();
  if (session.role !== "registry") {
    throw new Error(
      "Only the Registry office can change student records or the fees ledger.",
    );
  }
  return session;
}
