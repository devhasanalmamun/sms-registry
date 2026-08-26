import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Role separation.
 *
 * The brief allows a simple role toggle in place of authentication. The
 * important part is *where* the toggle is read: this module runs on the server
 * only, and every query that returns student-visible data derives its filters
 * from here. Switching to "student" in the UI does not merely hide staff data —
 * the data is never fetched, so it never reaches the browser at all.
 *
 * The acting student is resolved against the database rather than taken from
 * the cookie, so a cookie naming a student who no longer exists degrades to the
 * staff view instead of erroring. `cache` dedupes that lookup across everything
 * rendered for a single request.
 *
 * Swapping this for real authentication means replacing `getActingStudent()`
 * with a call into the auth provider; nothing downstream changes.
 */

export const ROLE_COOKIE = "sms_role";

export type Session =
  | { role: "staff"; studentId: null }
  | { role: "student"; studentId: string };

/**
 * The student currently being impersonated, or null when acting as staff — or
 * when the cookie points at a record that has since been deleted.
 */
export const getActingStudent = cache(async () => {
  const store = await cookies();
  const raw = store.get(ROLE_COOKIE)?.value ?? "staff";

  if (!raw.startsWith("student:")) return null;

  const id = raw.slice("student:".length).trim();
  if (!id) return null;

  return prisma.student.findUnique({
    where: { id },
    include: { programme: true },
  });
});

export async function getSession(): Promise<Session> {
  const student = await getActingStudent();
  return student
    ? { role: "student", studentId: student.id }
    : { role: "staff", studentId: null };
}

/**
 * Guard for code paths that must have a student. Throws rather than returning
 * null so a caller cannot accidentally continue with an undefined student.
 * Pages should use `studentOnly()` from lib/guards, which redirects instead.
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

export async function requireStaff() {
  const session = await getSession();
  if (session.role !== "staff") {
    throw new Error("This action is only available to Registry staff.");
  }
  return session;
}
