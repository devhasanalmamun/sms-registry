import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { getActingStudent, getSession } from "@/lib/session";
import { switchRole } from "@/server/session-actions";
import { NavLink } from "@/components/nav-link";

/**
 * The shell.
 *
 * The rail is ink; the working area is paper. Which links appear is decided
 * here on the server from the acting role, so a student never even receives
 * the markup for the staff sections.
 */

const staffNav = [
  { href: "/", label: "Today", note: "What needs action" },
  { href: "/students", label: "Students", note: "The student register" },
  { href: "/fees", label: "Fees", note: "Charges and payments" },
  { href: "/assessments", label: "Assessments", note: "Submissions and marks" },
];

const studentNav = [
  { href: "/me", label: "My results", note: "Published marks only" },
  { href: "/me/assessments", label: "My work", note: "Submit and resubmit" },
  { href: "/me/fees", label: "My fees", note: "Balance and receipts" },
];

export async function AppShell({ children }: { children: ReactNode }) {
  const session = await getSession();

  const students = await prisma.student.findMany({
    orderBy: { studentId: "asc" },
    select: { id: true, fullName: true, studentId: true, status: true },
  });

  const acting = await getActingStudent();

  const nav = session.role === "staff" ? staffNav : studentNav;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col bg-ink text-paper lg:min-h-screen lg:w-64">
        <div className="border-b border-white/10 px-5 py-5">
          <Link href={session.role === "staff" ? "/" : "/me"} className="block">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-white/45">
              Student Management
            </p>
            <p className="mt-1 font-display text-2xl leading-none tracking-tight">
              Registry
            </p>
          </Link>
        </div>

        <nav className="flex-1 px-2 py-3">
          <ul className="space-y-0.5">
            {nav.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} label={item.label} note={item.note} />
              </li>
            ))}
          </ul>
        </nav>

        <form
          action={switchRole}
          className="border-t border-white/10 px-5 py-4 text-paper"
        >
          <label
            htmlFor="role"
            className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-white/45"
          >
            Viewing as
          </label>
          <select
            id="role"
            name="role"
            defaultValue={
              session.role === "staff" ? "staff" : `student:${session.studentId}`
            }
            className="mt-1.5 w-full border border-white/20 bg-white/5 px-2 py-1.5 text-sm text-paper focus:outline-none focus:ring-1 focus:ring-white/60"
          >
            <option value="staff" className="text-ink">
              Registry staff
            </option>
            <optgroup label="Student" className="text-ink">
              {students.map((s) => (
                <option key={s.id} value={`student:${s.id}`} className="text-ink">
                  {s.fullName} · {s.studentId}
                </option>
              ))}
            </optgroup>
          </select>
          <button
            type="submit"
            className="mt-2 w-full border border-white/25 px-2 py-1.5 text-xs font-medium text-paper transition-colors hover:bg-white/10"
          >
            Switch view
          </button>
          <p className="mt-2.5 text-[0.6875rem] leading-snug text-white/40">
            {acting
              ? `Seeing exactly what ${acting.fullName.split(" ")[0]} sees. Withheld results are not fetched.`
              : "Full Registry access. Stands in for staff sign-in."}
          </p>
        </form>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
