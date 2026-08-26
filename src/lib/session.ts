import "server-only";
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
 * Swapping this for real auth means replacing `getSession()` with a call into
 * the auth provider; nothing downstream changes.
 */

export const ROLE_COOKIE = "sms_role";

export type Session =
  | { role: "staff"; studentId: null }
  | { role: "student"; studentId: string };

/** Parses the cookie. Anything unrecognised falls back to staff. */
export async function getSession(): Promise<Session> {
  const store = await cookies();
  const raw = store.get(ROLE_COOKIE)?.value ?? "staff";

  if (raw.startsWith("student:")) {
    const studentId = raw.slice("student:".length).trim();
    if (studentId) return { role: "student", studentId };
  }
  return { role: "staff", studentId: null };
}

/**
 * Resolves the acting student, or null when acting as staff / when the cookie
 * points at a student who has since been deleted.
 */
export async function getActingStudent() {
  const session = await getSession();
  if (session.role !== "student") return null;

  return prisma.student.findUnique({
    where: { id: session.studentId },
    include: { programme: true },
  });
}

/**
 * Guard for student-only routes. Throws rather than returning null so that a
 * page cannot accidentally continue rendering with an undefined student.
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
