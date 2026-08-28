"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stamp } from "@/components/registry";
import { IDLE } from "@/server/action-state";
import { saveGrade } from "@/server/actions";

function SaveButton({ dirtyLabel }: { dirtyLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "Saving…" : dirtyLabel}
    </Button>
  );
}

/**
 * One mark, in one cell of the marking sheet.
 *
 * Marks are entered and saved a row at a time. That is slower to build than a
 * single bulk form, but it is how marking actually happens — a marker works
 * down a pile of scripts and wants each one committed as they finish it, not
 * held in a browser tab that a stray refresh could empty.
 */
export function MarksheetGradeForm({
  assessmentId,
  studentId,
  score,
  feedback,
  hasSubmission,
}: {
  assessmentId: string;
  studentId: string;
  score: number | null;
  feedback: string | null;
  hasSubmission: boolean;
}) {
  const [state, formAction] = useActionState(saveGrade, IDLE);
  const error = state.errors?.score ?? state.message;

  return (
    <form
      action={formAction}
      className="flex items-start gap-2"
      id={`grade-${studentId}`}
    >
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="studentId" value={studentId} />
      <div>
        <Input
          name="score"
          type="number"
          min={0}
          max={100}
          step={1}
          defaultValue={score ?? ""}
          aria-label="Mark out of 100"
          className="w-16 text-right font-mono"
          aria-invalid={Boolean(state.errors?.score)}
          required
        />
        {error ? (
          <p className="mt-1 max-w-[12rem] text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : !hasSubmission && score === null ? (
          <p className="mt-1 max-w-[12rem] text-xs text-muted-foreground">
            Nothing submitted — a mark here records a non-submission.
          </p>
        ) : null}
      </div>
      <Input
        name="feedback"
        defaultValue={feedback ?? ""}
        placeholder="Feedback (optional)"
        aria-label="Feedback"
        className="w-36"
      />
      <SaveButton dirtyLabel={score === null ? "Save" : "Update"} />
    </form>
  );
}

/** Rendered when a mark has been changed since it was published. */
export function RemarkedNotice() {
  return <Stamp tone="watch">Re-marked</Stamp>;
}
