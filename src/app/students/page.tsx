import { staffOnly } from "@/lib/guards";
import { listProgrammes, listStudents } from "@/server/queries";
import type { EnrolmentStatus } from "@/generated/prisma/enums";
import { StudentFilters } from "@/components/student-filters";
import { EmptyState, LinkButton, PageHeader, Panel } from "@/components/registry";
import { StudentsTable } from "@/components/tables/students-table";

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

  // The table sorts and prints; the Decimal arithmetic stays on this side.
  const rows = students.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    fullName: s.fullName,
    email: s.email,
    programmeCode: s.programme.code,
    programmeName: s.programme.name,
    academicYear: s.academicYear,
    status: s.status,
    balance: Number(s.fees.balance.toFixed(2)),
    isOverdue: s.fees.isOverdue,
    inCredit: s.fees.inCredit,
  }));

  const filtered = Boolean(search || programmeId || status !== "ALL" || overdueOnly);

  return (
    <>
      <PageHeader
        title="Students"
        lede="Every student on the register, whatever their standing. Withdrawn and completed records stay searchable — Registry is asked about former students constantly."
        action={
          <LinkButton variant="default" href="/students/new" className="shrink-0">
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
                <LinkButton href="/students" variant="outline">
                  Clear the filters
                </LinkButton>
              ) : (
                <LinkButton variant="default" href="/students/new">
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
            <p className="border-b border-rule px-4 py-2 text-[0.8125rem] text-muted-foreground">
              {students.length} {students.length === 1 ? "record" : "records"}
              {filtered ? " matching" : ""}
            </p>
            <StudentsTable rows={rows} />
          </>
        )}
      </Panel>
    </>
  );
}
