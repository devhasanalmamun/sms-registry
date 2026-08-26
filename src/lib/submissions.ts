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

/**
 * The Content-Type we will serve a submission back with.
 *
 * Derived from the kind we identified from the file's own bytes — never from
 * the upload's `Content-Type`, which is a claim made by the client. Echoing
 * that claim back on download would let a student have their file served as
 * text/html from our origin, which is stored XSS.
 */
export const CANONICAL_MIME: Record<UploadKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

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

/**
 * Makes a client-supplied filename safe to echo in a Content-Disposition
 * header. Quotes and backslashes would let the value escape the quoted string
 * and inject further header parameters; control characters would split the
 * header outright.
 */
export function safeHeaderFilename(originalName: string): string {
  const cleaned = originalName
    // Control characters would split the header; a quote or a backslash
    // would escape the quoted value and let further parameters be added.
    .replace(/[\u0000-\u001f\u007f"\\]/g, "_")
    // Anything outside printable ASCII travels in the RFC 5987 form instead.
    .replace(/[^\u0020-\u007e]/g, "_")
    .slice(0, 120);

  // A name that sanitised away to nothing meaningful gets a real one, so
  // the header is never empty or a row of underscores.
  return /[a-z0-9]/i.test(cleaned) ? cleaned : "submission";
}

/** Filename written to disk. Never trusts the client-supplied name. */
export function storedNameFor(
  submissionKey: string,
  attempt: number,
  kind: UploadKind,
): string {
  return `${submissionKey}-v${attempt}.${kind}`;
}
