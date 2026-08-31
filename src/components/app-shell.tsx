import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { getActingStaff, getActingStudent, getSession } from "@/lib/session";
import { NavLink } from "@/components/nav-link";
import { RoleSwitcher } from "@/components/role-switcher";

/**
 * The shell.
 *
 * The role selector sits at the foot of the margin, under a rule, the way the
 * signature block sits at the foot of a form. It decides what the navigation
 * contains, so it stays visible at all times — the margin is sticky and the
 * selector is pinned to its bottom edge, never scrolled away with the list.
 *
 * Which links appear is decided here on the server from the acting role, so a
 * student never receives the markup for the teaching sections at all.
 */

const nav = {
  registry: {
    label: "Registry office",
    items: [
      { href: "/", label: "Today", note: "What needs doing right now" },
      { href: "/students", label: "Students", note: "Find and enrol students" },
      { href: "/fees", label: "Fees", note: "Charges, payments, who is behind" },
    ],
  },
  staff: {
    label: "Teaching",
    items: [
      {
        href: "/assessments",
        label: "My assessments",
        note: "What you have set, and what is due in",
      },
      {
        href: "/assessments/new",
        label: "Set an assessment",
        note: "Title, module, deadline, cohort",
      },
    ],
  },
  student: {
    label: "Your record",
    items: [
      { href: "/me", label: "My results", note: "Marks released to you" },
      {
        href: "/me/assessments",
        label: "My work",
        note: "Hand in or replace a file",
      },
      { href: "/me/fees", label: "My fees", note: "What you owe, and by when" },
    ],
  },
} as const;

const homeFor = { registry: "/", staff: "/assessments", student: "/me" } as const;

export async function AppShell({ children }: { children: ReactNode }) {
  const session = await getSession();

  const [students, staff, actingStudent, actingStaff] = await Promise.all([
    prisma.student.findMany({
      orderBy: { studentId: "asc" },
      select: { id: true, fullName: true, studentId: true },
    }),
    prisma.staffMember.findMany({
      orderBy: { staffId: "asc" },
      select: { id: true, fullName: true, title: true, department: true },
    }),
    getActingStudent(),
    getActingStaff(),
  ]);

  const section = nav[session.role];

  const value =
    session.role === "student"
      ? `student:${session.studentId}`
      : session.role === "staff"
        ? `staff:${session.staffId}`
        : "registry";

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/*
       * The margin stays put while the register scrolls, so navigation and the
       * role selector are always reachable on a long list. Sticky rather than
       * fixed: it keeps its place in the flow, so the main column needs no
       * offset. Below `lg` it is an ordinary block at the top of the page.
       */}
      <aside className="flex shrink-0 flex-col border-b border-rule-hard bg-sidebar lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <Link
          href={homeFor[session.role]}
          className="block border-b border-rule-hard px-4 py-4"
        >
          <span className="masthead block text-xl text-foreground">Registry</span>
          <span className="mt-0.5 block text-xs text-graphite">
            Student Management System
          </span>
        </Link>

        {/* min-h-0 so this is what scrolls if the margin outgrows the viewport. */}
        <nav className="min-h-0 flex-1 overflow-y-auto py-3" aria-label="Sections">
          <p className="colhead px-4 pb-1.5 text-dim">{section.label}</p>
          <ul>
            {section.items.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  label={item.label}
                  note={item.note}
                  siblings={section.items.map((i) => i.href)}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* mt-auto keeps it on the bottom edge even when the nav is short. */}
        <RoleSwitcher
          value={value}
          students={students}
          staff={staff}
          actingName={
            actingStudent?.fullName.split(" ")[0] ?? actingStaff?.fullName ?? null
          }
          role={session.role}
        />
      </aside>

      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
