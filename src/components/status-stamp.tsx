import type { EnrolmentStatus } from "@/generated/prisma/enums";
import { Stamp } from "@/components/registry";

/**
 * Enrolment status, stamped.
 *
 * Only ENROLLED is quiet — it is the expected state, and a register where
 * every row shouts is a register nobody scans. Everything else is an exception
 * that changes what Registry may do with the record.
 */
const tones: Record<EnrolmentStatus, { tone: "sage" | "amber" | "neutral" | "quiet"; label: string }> =
  {
    ENROLLED: { tone: "sage", label: "Enrolled" },
    DEFERRED: { tone: "amber", label: "Deferred" },
    WITHDRAWN: { tone: "neutral", label: "Withdrawn" },
    COMPLETED: { tone: "quiet", label: "Completed" },
  };

export function StatusStamp({ status }: { status: EnrolmentStatus }) {
  const { tone, label } = tones[status];
  return <Stamp tone={tone}>{label}</Stamp>;
}
