import { staffOnly } from "@/lib/guards";
import { listProgrammes } from "@/server/queries";
import { enrolStudent } from "@/server/actions";
import { StudentForm } from "@/components/student-form";
import { EmptyState, PageHeader, Panel } from "@/components/registry";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  await staffOnly();
  const programmes = await listProgrammes();

  return (
    <>
      <PageHeader
        eyebrow="Register · New record"
        title="Enrol a student"
        lede="Enrolling raises the programme's tuition charge at the same time, so the student appears in the fees ledger straight away."
      />

      {programmes.length === 0 ? (
        <Panel>
          <EmptyState title="No programmes exist yet.">
            A student has to be enrolled onto something. Add a programme to the
            database — the seed script creates two.
          </EmptyState>
        </Panel>
      ) : (
        <StudentForm
          action={enrolStudent}
          title="Student details"
          hint="All fields are required."
          submitLabel="Enrol student"
          programmes={programmes.map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            feeAmount: p.feeAmount.toFixed(2),
          }))}
        />
      )}
    </>
  );
}
