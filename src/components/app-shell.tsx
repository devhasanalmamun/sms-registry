import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { getActingStudent, getSession } from "@/lib/session";
import { NavLink } from "@/components/nav-link";
import { RoleSwitcher } from "@/components/role-switcher";

/**
 * The shell.
 *
 * The index margin runs down the left, in the same banded stock as the tables,
 * so the chrome is made of the same material as the register rather than being
 * a dark slab bolted to the side of it. Which links appear is decided here on
 * the server from the acting role, so a student never receives the markup for
 * the staff sections at all.
 */

const staffNav = [
  { href: "/", label: "Today", note: "What needs action before you go home" },
  { href: "/students", label: "Students", note: "Every record, whatever its standing" },
  { href: "/fees", label: "Fees", note: "Charges raised and payments received" },
  { href: "/assessments", label: "Assessments", note: "Deadlines, submissions, marks" },
];

const studentNav = [
  { href: "/me", label: "My results", note: "Marks that have been released to you" },
  { href: "/me/assessments", label: "My work", note: "Hand in, or replace what you sent" },
  { href: "/me/fees", label: "My fees", note: "What you owe, and by when" },
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
       * The margin stays put while the register scrolls: on a long list the
       * navigation and the role toggle have to stay reachable. Sticky rather
       * than fixed, so it keeps its place in the flow and the main column needs
       * no offset. Below `lg` it is an ordinary block at the top of the page.
       */}
      <aside className="flex shrink-0 flex-col border-b border-rule-hard bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r">
        <Link
          href={session.role === "staff" ? "/" : "/me"}
          className="block bg-ink px-4 py-4 text-paper"
        >
          <span className="colhead block text-[0.5625rem] text-paper/55">
            Student Management
          </span>
          <span className="masthead mt-1 block text-2xl">Registry</span>
        </Link>

        {/* min-h-0 so this is what scrolls if the margin ever outgrows the
            viewport — never the role toggle pinned below it. */}
        <nav className="min-h-0 flex-1 overflow-y-auto py-2">
          <ul>
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

      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
