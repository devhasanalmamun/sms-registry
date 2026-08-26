/**
 * Submission rules.
 *
 * Two decisions the brief leaves open, resolved the way a Registry team would
 * expect:
 *
 *  1. A late submission is accepted, not rejected. Refusing it would leave the
 *     student with no record at all, which is worse for everyone; the flag is
 *     what matters, and it is stamped at write time so that moving a deadline
 *     later does not retroactively forgive a student who missed the original.
 *
 *  2. Resubmission is allowed *before* the deadline only. After it, the
 *     submitted work is the work — otherwise the deadline means nothing.
 */

export const ACCEPTED_UPLOADS = {
  pdf: {
    extensions: [".pdf"],
    mimeTypes: ["application/pdf"],
    /** %PDF */
    magic: [[0x25, 0x50, 0x44, 0x46]],
  },
  docx: {
    extensions: [".docx"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    /** DOCX is a ZIP container: PK\x03\x04 (or an empty/spanned archive). */
    magic: [
      [0x50, 0x4b, 0x03, 0x04],
      [0x50, 0x4b, 0x05, 0x06],
      [0x50, 0x4b, 0x07, 0x08],
    ],
  },
} as const;

export type UploadKind = keyof typeof ACCEPTED_UPLOADS;

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

/**
 * Identifies the upload from its *content*, cross-checked against the file
 * name. A renamed .exe announces itself as a PDF in the Content-Type header,
 * so the header alone is not evidence of anything.
 */
export function identifyUpload(
  filename: string,
  bytes: Uint8Array,
): UploadKind | null {
  const ext = extensionOf(filename);

  for (const [kind, spec] of Object.entries(ACCEPTED_UPLOADS)) {
    const extensionMatches = (spec.extensions as readonly string[]).includes(ext);
    const magicMatches = spec.magic.some((signature) =>
      signature.every((byte, i) => bytes[i] === byte),
    );
    if (extensionMatches && magicMatches) return kind as UploadKind;
  }
  return null;
}

export function isLate(submittedAt: Date, dueAt: Date): boolean {
  return submittedAt.getTime() > dueAt.getTime();
}

export type SubmissionDecision =
  | { allowed: true; late: boolean }
  | { allowed: false; reason: string };

/**
 * Decides whether an upload may proceed.
 *
 * `existing` is the student's current submission for this assessment, if any.
 */
export function decideSubmission(params: {
  now: Date;
  dueAt: Date;
  existing: { submittedAt: Date } | null;
  studentStatus: "ENROLLED" | "DEFERRED" | "WITHDRAWN" | "COMPLETED";
}): SubmissionDecision {
  const { now, dueAt, existing, studentStatus } = params;

  if (studentStatus === "WITHDRAWN") {
    return {
      allowed: false,
      reason:
        "This student has withdrawn and can no longer submit work. Contact Registry if this is wrong.",
    };
  }

  const late = isLate(now, dueAt);

  if (existing && late) {
    return {
      allowed: false,
      reason:
        "The deadline has passed, so your existing submission is final. Resubmission is only possible before the deadline.",
    };
  }

  return { allowed: true, late };
}

/** Filename written to disk. Never trusts the client-supplied name. */
export function storedNameFor(
  submissionKey: string,
  attempt: number,
  kind: UploadKind,
): string {
  return `${submissionKey}-v${attempt}.${kind}`;
}
