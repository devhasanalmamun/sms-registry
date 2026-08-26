import "server-only";
import { redirect } from "next/navigation";
import { getActingStudent, getSession } from "@/lib/session";

/**
 * Page-level guards.
 *
 * Both redirect rather than throw. A URL is not a secret — the data behind it
 * is — so someone who lands on the wrong page should simply arrive somewhere
 * they can use, not at an error.
 */

/** Staff pages. A student who navigates here is sent to their own view. */
export async function staffOnly() {
  const session = await getSession();
  if (session.role === "student") redirect("/me");
  return session;
}

/**
 * Student pages. Returns the acting student.
 *
 * A cookie naming a deleted student resolves to no student (see lib/session),
 * so this lands on the staff view rather than an error page.
 */
export async function studentOnly() {
  const student = await getActingStudent();
  if (!student) redirect("/");
  return student;
}
