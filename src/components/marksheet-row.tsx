"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Input, Stamp, Td } from "@/components/ui";
import { IDLE } from "@/server/action-state";
import { saveGrade } from "@/server/actions";
import { classify } from "@/lib/grading";

function SaveButton({ dirtyLabel }: { dirtyLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : dirtyLabel}
    </Button>
  );
}

/**
 * One line of the marking sheet.
 *
 * Marks are entered and saved a row at a time. That is slower to build than a
 * single bulk form, but it is how marking actually happens — a marker works
 * down a pile of scripts and wants each one committed as they finish it, not
 * held in a browser tab that a stray refresh could empty.
 */
export function MarksheetGradeCells({
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
  const band = score !== null ? classify(score) : null;

  return (
    <>
      <Td>
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
              className="w-20 text-right font-mono"
              invalid={Boolean(state.errors?.score)}
              required
            />
            {error ? (
              <p className="mt-1 max-w-[12rem] text-xs text-seal" role="alert">
                {error}
              </p>
            ) : !hasSubmission && score === null ? (
              <p className="mt-1 max-w-[12rem] text-xs text-ink-faint">
                Nothing submitted — a mark here records a non-submission.
              </p>
            ) : null}
          </div>
          <Input
            name="feedback"
            defaultValue={feedback ?? ""}
            placeholder="Feedback (optional)"
            aria-label="Feedback"
            className="w-44"
          />
          <SaveButton dirtyLabel={score === null ? "Save" : "Update"} />
        </form>
      </Td>
      <Td className="text-ink-soft">
        {band ? (
          band.passed ? (
            band.band
          ) : (
            <span className="text-seal">{band.band}</span>
          )
        ) : (
          <span className="text-ink-faint">—</span>
        )}
      </Td>
    </>
  );
}

/** Rendered when a mark has been changed since it was published. */
export function RemarkedNotice() {
  return <Stamp tone="amber">Re-marked</Stamp>;
}
