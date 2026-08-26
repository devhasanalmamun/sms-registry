"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input, Notice } from "@/components/ui";
import { IDLE } from "@/server/action-state";
import { createAssessment } from "@/server/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Creating…" : "Create assessment"}
    </Button>
  );
}

/** Defaults to a fortnight out at 17:00 — the deadline everyone actually sets. */
function defaultDeadline() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(17, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AssessmentForm() {
  const [state, formAction] = useActionState(createAssessment, IDLE);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="grid gap-4 p-4 sm:grid-cols-2">
      {state.message ? (
        <div className="sm:col-span-2">
          <Notice tone="seal">{state.message}</Notice>
        </div>
      ) : null}

      <Field label="Title" htmlFor="title" error={errors.title}>
        <Input
          id="title"
          name="title"
          placeholder="Coursework 2 — Database Design"
          invalid={Boolean(errors.title)}
          required
        />
      </Field>

      <Field label="Module" htmlFor="module" error={errors.module}>
        <Input
          id="module"
          name="module"
          placeholder="CS210 Databases"
          invalid={Boolean(errors.module)}
          required
        />
      </Field>

      <Field
        label="Submission deadline"
        htmlFor="dueAt"
        error={errors.dueAt}
        hint="Work submitted after this is accepted, but flagged as late."
        className="sm:col-span-2"
      >
        <Input
          id="dueAt"
          name="dueAt"
          type="datetime-local"
          defaultValue={defaultDeadline()}
          invalid={Boolean(errors.dueAt)}
          required
        />
      </Field>

      <div className="sm:col-span-2">
        <Submit />
      </div>
    </form>
  );
}
