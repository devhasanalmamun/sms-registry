import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { getActingStudent, getSession } from "@/lib/session";
import { NavLink } from "@/components/nav-link";
import { RoleSwitcher } from "@/components/role-switcher";

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
    select: { id: true, fullName: true, studentId: true },
  });

  const acting = await getActingStudent();

  const nav = session.role === "staff" ? staffNav : studentNav;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/*
       * The rail stays put while the register scrolls: on a long list of
       * students the navigation and the role toggle have to remain reachable
       * without scrolling back to the top. Sticky rather than fixed, so it
       * keeps its place in the flow and the main column needs no offset. Below
       * `lg` it goes back to being an ordinary block at the top of the page.
       */}
      <aside className="flex shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:w-64">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Link href={session.role === "staff" ? "/" : "/me"} className="block">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-sidebar-foreground/45">
              Student Management
            </p>
            <p className="mt-1 font-display text-2xl leading-none tracking-tight">
              Registry
            </p>
          </Link>
        </div>

        {/* min-h-0 so this is what scrolls if the rail ever outgrows the
            viewport — never the role toggle pinned below it. */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {nav.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} label={item.label} note={item.note} />
              </li>
            ))}
          </ul>
        </nav>

        <RoleSwitcher
          value={
            session.role === "staff" ? "staff" : `student:${session.studentId}`
          }
          students={students}
          actingFirstName={acting?.fullName.split(" ")[0]}
        />
      </aside>

      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
