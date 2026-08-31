import "server-only";
import { redirect } from "next/navigation";
import { getActingStaff, getActingStudent, getSession } from "@/lib/session";

/**
 * Page-level guards.
 *
 * These redirect rather than throw. A URL is not a secret — the data behind it
 * is — so someone who lands on the wrong page should simply arrive somewhere
 * they can use, not at an error page.
 *
 * Each guard also returns the actor it just proved, so a page never has to
 * fetch the session twice.
 */

/**
 * Where a given role belongs when it has wandered somewhere it cannot go.
 *
 * Staff land on their assessment list rather than a dashboard of their own:
 * that list, with its submitted/marked/released counts, already answers "what
 * needs doing today" for a marker. A second page summarising it would be a
 * page that exists to have a page.
 */
async function home() {
  const session = await getSession();
  if (session.role === "student") return "/me";
  if (session.role === "staff") return "/assessments";
  return "/";
}

/** Registry pages: enrolment and the fees ledger. */
export async function registryOnly() {
  const session = await getSession();
  if (session.role !== "registry") redirect(await home());
  return session;
}

/**
 * Teaching pages: assessments, marking, releasing results.
 *
 * Returns the acting staff member, because every query behind these pages is
 * scoped to the assessments that person owns.
 */
export async function staffOnly() {
  const staff = await getActingStaff();
  if (!staff) redirect(await home());
  return staff;
}

/**
 * Student pages. Returns the acting student.
 *
 * A cookie naming a deleted student resolves to no student (see lib/session),
 * so this lands on the Registry view rather than an error page.
 */
export async function studentOnly() {
  const student = await getActingStudent();
  if (!student) redirect(await home());
  return student;
}
