import { staffOnly } from "@/lib/guards";
import { listProgrammes } from "@/server/queries";
import { AssessmentForm } from "@/components/assessment-form";
import { PageHeader, Panel } from "@/components/registry";

export const dynamic = "force-dynamic";

/**
 * Setting an assessment.
 *
 * On its own route rather than a form under the list, for the same reason
 * enrolling a student is: it is a deliberate act with four decisions in it, and
 * the last of those — the cohort — is the one people get wrong.
 */
export default async function NewAssessmentPage() {
  const staff = await staffOnly();
  const programmes = await listProgrammes();

  return (
    <>
      <PageHeader
        trail={{ href: "/assessments", label: "My assessments" }}
        title="Set an assessment"
        lede="It appears immediately for the students on the course you choose. The deadline decides what counts as late and when resubmission closes — students can replace their file freely up to it, and not after."
      />

      <Panel>
        <AssessmentForm
          programmes={programmes.map((p) => ({
            value: p.id,
            label: p.name,
            hint: p.code,
          }))}
        />
      </Panel>

      <p className="mt-4 text-xs text-muted-foreground">
        You will be recorded as having set this assessment
        {staff.title ? ` (${staff.title} ${staff.fullName})` : ` (${staff.fullName})`},
        and you alone can mark it or release its results.
      </p>
    </>
  );
}
