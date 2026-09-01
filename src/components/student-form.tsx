"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { IDLE, type ActionState } from "@/server/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Notice, Panel, PanelHeader, SelectField } from "@/components/registry";

type Programme = { id: string; code: string; name: string; feeAmount: string };

type StudentDefaults = {
  id?: string;
  fullName?: string;
  email?: string;
  dateOfBirth?: string;
  programmeId?: string;
  academicYear?: number;
  status?: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="default" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * One form, two jobs: enrolling and amending. The fields are identical, so
 * splitting them would only create two places for a validation rule to drift.
 */
export function StudentForm({
  action,
  programmes,
  defaults = {},
  submitLabel,
  title,
  hint,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  programmes: Programme[];
  defaults?: StudentDefaults;
  submitLabel: string;
  title: string;
  hint?: string;
}) {
  const [state, formAction] = useActionState(action, IDLE);
  const errors = state.errors ?? {};

  return (
    <Panel>
      <PanelHeader title={title} hint={hint} />
      <form action={formAction} className="grid gap-5 p-4 sm:grid-cols-2">
        {defaults.id ? <input type="hidden" name="id" value={defaults.id} /> : null}

        {state.message ? (
          <div className="sm:col-span-2">
            <Notice tone={state.ok ? "clear" : "flag"}>{state.message}</Notice>
          </div>
        ) : null}

        <Field
          label="Full name"
          htmlFor="fullName"
          error={errors.fullName}
          className="sm:col-span-2"
        >
          <Input
            id="fullName"
            name="fullName"
            defaultValue={defaults.fullName}
            aria-invalid={Boolean(errors.fullName)}
            autoComplete="off"
            required
          />
        </Field>

        <Field
          label="Email"
          htmlFor="email"
          error={errors.email}
          hint="Used as the student's unique identifier alongside their student ID."
        >
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaults.email}
            aria-invalid={Boolean(errors.email)}
            autoComplete="off"
            required
          />
        </Field>

        <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth}>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={defaults.dateOfBirth}
            aria-invalid={Boolean(errors.dateOfBirth)}
            required
          />
        </Field>

        <Field
          label="Programme"
          htmlFor="programmeId"
          error={errors.programmeId}
          hint={
            defaults.id
              ? undefined
              : "The programme fee is charged automatically on enrolment."
          }
        >
          <SelectField
            id="programmeId"
            name="programmeId"
            defaultValue={defaults.programmeId}
            placeholder="Choose a programme"
            invalid={Boolean(errors.programmeId)}
            required
            options={programmes.map((p) => ({
              value: p.id,
              label: `${p.code} — ${p.name}`,
              hint: `£${p.feeAmount}`,
            }))}
          />
        </Field>

        <Field label="Academic year" htmlFor="academicYear" error={errors.academicYear}>
          <Input
            id="academicYear"
            name="academicYear"
            type="number"
            min={1}
            max={7}
            defaultValue={defaults.academicYear ?? 1}
            aria-invalid={Boolean(errors.academicYear)}
            required
          />
        </Field>

        <Field
          label="Enrolment status"
          htmlFor="status"
          error={errors.status}
          hint="Withdrawn students keep their record and anything they still owe."
        >
          <SelectField
            id="status"
            name="status"
            defaultValue={defaults.status ?? "ENROLLED"}
            invalid={Boolean(errors.status)}
            options={[
              { value: "ENROLLED", label: "Enrolled" },
              { value: "DEFERRED", label: "Deferred" },
              { value: "WITHDRAWN", label: "Withdrawn" },
              { value: "COMPLETED", label: "Completed" },
            ]}
          />
        </Field>

        <div className="flex items-center gap-3 sm:col-span-2">
          <SubmitButton label={submitLabel} />
          {defaults.id ? null : (
            <p className="text-xs text-muted-foreground">
              A student ID is allocated automatically, continuing this year&rsquo;s
              sequence.
            </p>
          )}
        </div>
      </form>
    </Panel>
  );
}
