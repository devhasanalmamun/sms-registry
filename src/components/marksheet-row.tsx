"use client";

import {
  useActionState,
  useRef,
  useState,
  type FocusEvent,
  type RefObject,
} from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Stamp } from "@/components/registry";
import { IDLE } from "@/server/action-state";
import { saveGrade } from "@/server/actions";

/**
 * One mark, across two cells of the marking sheet.
 *
 * Marks are entered and saved a row at a time. That is slower to build than a
 * single bulk form, but it is how marking actually happens — a marker works
 * down a pile of scripts and wants each one committed as they finish it, not
 * held in a browser tab that a stray refresh could empty.
 *
 * The mark and the feedback are separate columns, so they cannot sit inside one
 * `<form>` element: a form cannot span two table cells. They are bound instead
 * by the HTML `form` attribute — the feedback textarea names the form in the
 * mark cell, and the browser submits both together. That is what the attribute
 * is for, and it is why these two components have to agree on an id.
 */

export const gradeFormId = (studentId: string) => `grade-${studentId}`;

/**
 * Saving happens when a field is left, not when a button is pressed.
 *
 * A marker's hands are on the keyboard going down a pile of scripts: type the
 * mark, tab, type the comment, tab. Requiring a click between each one is the
 * kind of friction that gets a spreadsheet opened instead. Tabbing away is an
 * unambiguous "I have finished with this field", so that is the save signal.
 *
 * Two guards keep it from being annoying: nothing is sent unless the value
 * actually changed, and nothing is sent without a mark, because a result row
 * with no score is not a thing this domain has.
 */
// Takes the ref as an argument rather than closing over it in a factory: a
// factory called during render trips `react-hooks/refs`, which cannot see that
// the ref is only ever read once the blur has happened.
function saveOnBlur(
  event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  lastSaved: RefObject<string>,
  onBlocked?: (blocked: boolean) => void,
) {
  const field = event.currentTarget;
  const form = field.form;
  if (!form || field.value === lastSaved.current) return;

  const score = form.elements.namedItem("score");
  if (!(score instanceof HTMLInputElement) || score.value.trim() === "") {
    // Say so. Typing a comment and tabbing away, only to find it gone on the
    // next load, is worse than any amount of friction.
    onBlocked?.(true);
    return;
  }

  onBlocked?.(false);
  lastSaved.current = field.value;
  form.requestSubmit();
}

/**
 * The mark box, which reports its own state.
 *
 * Status text under the input pushed the row taller the moment a save started
 * and shorter again when it finished, so every save made the sheet jump. A save
 * in flight is shown by fading the box instead: the reader gets the feedback and
 * the table does not move. The row already reports the outcome anyway — the
 * class and the released state both change.
 */
function ScoreInput(props: React.ComponentProps<typeof Input>) {
  const { pending } = useFormStatus();
  return (
    <Input
      {...props}
      aria-busy={pending || undefined}
      className={cn(
        "w-16 text-right font-mono transition-opacity",
        pending && "opacity-50",
      )}
    />
  );
}

/** The Mark cell: owns the form that the feedback cell posts into. */
export function MarksheetGradeForm({
  assessmentId,
  studentId,
  score,
}: {
  assessmentId: string;
  studentId: string;
  score: number | null;
}) {
  const [state, formAction] = useActionState(saveGrade, IDLE);
  const lastSaved = useRef(score === null ? "" : String(score));
  const error =
    state.errors?.score ?? (state.ok === false ? state.message : undefined);

  return (
    <form action={formAction} id={gradeFormId(studentId)}>
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="studentId" value={studentId} />
      <ScoreInput
        name="score"
        type="number"
        min={0}
        max={100}
        step={1}
        defaultValue={score ?? ""}
        aria-label="Mark out of 100"
        aria-invalid={Boolean(state.errors?.score)}
        onBlur={(event) => saveOnBlur(event, lastSaved)}
      />
      {/* Only a failure gets words. It has to be read, so it may cost a line. */}
      {error ? (
        <p className="mt-1 w-[7.5rem] whitespace-normal text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * The Feedback cell.
 *
 * A textarea rather than a single line, because feedback is prose and the
 * marker needs to see what they wrote. It posts into the mark cell's form via
 * the `form` attribute, and saves on the same blur rule.
 */
export function MarksheetFeedbackCell({
  studentId,
  feedback,
}: {
  studentId: string;
  feedback: string | null;
}) {
  const lastSaved = useRef(feedback ?? "");
  const [needsMark, setNeedsMark] = useState(false);

  return (
    <div className="w-[13rem]">
      <Textarea
        form={gradeFormId(studentId)}
        name="feedback"
        defaultValue={feedback ?? ""}
        placeholder="Feedback for the student (optional)"
        aria-label="Feedback for the student"
        rows={2}
        className="h-[4.25rem] w-full resize-y text-sm"
        aria-describedby={needsMark ? `feedback-hint-${studentId}` : undefined}
        onBlur={(event) => saveOnBlur(event, lastSaved, setNeedsMark)}
      />
      {needsMark ? (
        <p
          id={`feedback-hint-${studentId}`}
          className="mt-1 text-xs text-watch"
          role="status"
        >
          Enter a mark to save this comment.
        </p>
      ) : null}
    </div>
  );
}

/** Rendered when a mark has been changed since it was published. */
export function RemarkedNotice() {
  return <Stamp tone="watch">Re-marked</Stamp>;
}
