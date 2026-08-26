import Link from "next/link";
import { staffOnly } from "@/lib/guards";
import { listProgrammes, listStudents } from "@/server/queries";
import type { EnrolmentStatus } from "@/generated/prisma/enums";
import {
  Code,
  EmptyState,
  LinkButton,
  PageHeader,
  Panel,
  Stamp,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { StatusStamp } from "@/components/status-stamp";
import { StudentFilters } from "@/components/student-filters";

export const dynamic = "force-dynamic";

const STATUSES: (EnrolmentStatus | "ALL")[] = [
  "ALL",
  "ENROLLED",
  "DEFERRED",
  "WITHDRAWN",
  "COMPLETED",
];

const statusLabel: Record<string, string> = {
  ALL: "Any status",
  ENROLLED: "Enrolled",
  DEFERRED: "Deferred",
  WITHDRAWN: "Withdrawn",
  COMPLETED: "Completed",
};

/**
 * The student register.
 *
 * Filters are a plain GET form: the resulting URL is shareable and survives a
 * refresh. Registry staff live in this screen and send each other links to it.
 */
export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await staffOnly();
  const params = await searchParams;

  const search = typeof params.q === "string" ? params.q : "";
  const rawProgramme = typeof params.programme === "string" ? params.programme : "";
  // "any" is the dropdown's explicit no-filter value — Radix Select has no
  // empty-string option, and an empty value is indistinguishable from unset.
  const programmeId = rawProgramme === "any" ? "" : rawProgramme;
  const status =
    typeof params.status === "string" && STATUSES.includes(params.status as EnrolmentStatus)
      ? (params.status as EnrolmentStatus | "ALL")
      : "ALL";
  const overdueOnly = params.arrears === "1";

  const [students, programmes] = await Promise.all([
    listStudents({ search, programmeId, status, overdueOnly }),
    listProgrammes(),
  ]);

  const filtered = Boolean(search || programmeId || status !== "ALL" || overdueOnly);

  return (
    <>
      <PageHeader
        eyebrow="Register"
        title="Students"
        lede="Every student on the register, whatever their standing. Withdrawn and completed records stay searchable — Registry is asked about former students constantly."
        action={
          <LinkButton variant="primary" href="/students/new" className="shrink-0">
            Enrol a student
          </LinkButton>
        }
      />

      <Panel className="mb-6">
        <StudentFilters
          search={search}
          programmeId={programmeId}
          status={status}
          overdueOnly={overdueOnly}
          filtered={filtered}
          programmes={programmes.map((p) => ({
            value: p.id,
            label: `${p.code} — ${p.name}`,
          }))}
          statuses={STATUSES.map((value) => ({
            value,
            label: statusLabel[value],
          }))}
        />
      </Panel>

      <Panel>
        {students.length === 0 ? (
          <EmptyState
            title={filtered ? "No students match those filters." : "The register is empty."}
            action={
              filtered ? (
                <LinkButton href="/students">Clear the filters</LinkButton>
              ) : (
                <LinkButton variant="primary" href="/students/new">
                  Enrol the first student
                </LinkButton>
              )
            }
          >
            {filtered
              ? "Try a shorter search term, or widen the status filter."
              : "Enrol a student to start the register."}
          </EmptyState>
        ) : (
          <>
            <p className="border-b border-rule px-4 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
              {students.length} {students.length === 1 ? "record" : "records"}
              {filtered ? " matching" : ""}
            </p>
            <Table>
              <thead>
                <tr>
                  <Th>Student ID</Th>
                  <Th>Name</Th>
                  <Th>Programme</Th>
                  <Th numeric>Year</Th>
                  <Th>Status</Th>
                  <Th numeric>Balance</Th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-paper">
                    <Td>
                      <Code>{s.studentId}</Code>
                    </Td>
                    <Td>
                      <Link
                        href={`/students/${s.id}`}
                        className="font-medium underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                      >
                        {s.fullName}
                      </Link>
                      <span className="block text-xs text-ink-faint">{s.email}</span>
                    </Td>
                    <Td className="text-ink-soft">
                      <span className="font-mono text-xs">{s.programme.code}</span>
                      <span className="block text-xs text-ink-faint">
                        {s.programme.name}
                      </span>
                    </Td>
                    <Td numeric className="text-ink-soft">
                      {s.academicYear}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusStamp status={s.status} />
                        {s.fees.isOverdue ? <Stamp tone="seal">Arrears</Stamp> : null}
                        {s.fees.inCredit ? <Stamp tone="amber">In credit</Stamp> : null}
                      </div>
                    </Td>
                    <Td
                      numeric
                      className={
                        s.fees.isOverdue
                          ? "font-medium text-seal"
                          : s.fees.balance.lessThanOrEqualTo(0)
                            ? "text-sage"
                            : "text-ink-soft"
                      }
                    >
                      {formatMoney(s.fees.balance.toFixed(2))}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Panel>
    </>
  );
}
