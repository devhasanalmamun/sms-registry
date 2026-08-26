"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Notice } from "@/components/ui";

type Outcome =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "done"; message: string; late: boolean };

/**
 * The submit control.
 *
 * Deliberately explicit about what is about to happen: a student uploading
 * after the deadline is told it will be marked late *before* they upload, not
 * after. The same warning appears again in the confirmation, because that flag
 * follows their work to the exam board.
 */
export function SubmissionUpload({
  assessmentId,
  isLate,
  hasExisting,
  canResubmit,
}: {
  assessmentId: string;
  isLate: boolean;
  hasExisting: boolean;
  canResubmit: boolean;
}) {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setBusy(true);
    setOutcome({ kind: "idle" });

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        body: data,
      });
      const body = await response.json();

      if (!response.ok) {
        setOutcome({
          kind: "error",
          message: body.error ?? "The upload failed. Try again.",
        });
        return;
      }

      form.reset();
      setOutcome({
        kind: "done",
        late: body.late,
        message: body.late
          ? body.resubmitted
            ? "Resubmitted. This is after the deadline, so it stays flagged as late."
            : "Submitted after the deadline. It has been accepted and flagged as late."
          : body.resubmitted
            ? `Resubmitted — this replaces your previous file (attempt ${body.attempt}).`
            : "Submitted. You can replace this file any time before the deadline.",
      });
      startTransition(() => router.refresh());
    } catch {
      setOutcome({
        kind: "error",
        message: "Could not reach the server. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (hasExisting && !canResubmit) {
    return (
      <Notice tone="neutral">
        The deadline has passed, so the file you submitted is final.
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="assessmentId" value={assessmentId} />

      {isLate ? (
        <Notice tone="amber">
          This deadline has passed. Your work will still be accepted, but it will
          be recorded as a late submission.
        </Notice>
      ) : null}

      {outcome.kind === "error" ? (
        <Notice tone="seal">{outcome.message}</Notice>
      ) : null}

      {outcome.kind === "done" ? (
        <Notice tone={outcome.late ? "amber" : "sage"}>{outcome.message}</Notice>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
          className="max-w-full text-sm file:mr-3 file:cursor-pointer file:border file:border-rule-strong file:bg-paper file:px-3 file:py-1.5 file:text-sm file:text-ink hover:file:border-ink"
        />
        <Button type="submit" variant="primary" disabled={busy || pending}>
          {busy
            ? "Uploading…"
            : hasExisting
              ? "Replace my submission"
              : "Submit work"}
        </Button>
      </div>

      <p className="text-xs text-ink-faint">
        PDF or DOCX, up to 10 MB.
        {hasExisting
          ? " Replacing keeps one submission on record — the new file supersedes the old one."
          : ""}
      </p>
    </form>
  );
}
