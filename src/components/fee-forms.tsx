"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input, Notice } from "@/components/ui";
import { SelectField } from "@/components/select";
import { IDLE } from "@/server/action-state";
import { addCharge, recordPayment } from "@/server/actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Recording a receipt.
 *
 * The reference is required and unique: it is how a payment on this screen is
 * matched to a line on a bank statement, and it is what stops the same receipt
 * being keyed twice by two people.
 */
export function PaymentForm({ studentId }: { studentId: string }) {
  const [state, formAction] = useActionState(recordPayment, IDLE);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="grid gap-4 p-4 sm:grid-cols-2">
      <input type="hidden" name="studentId" value={studentId} />

      {state.message ? (
        <div className="sm:col-span-2">
          <Notice tone={state.ok ? "sage" : "seal"}>{state.message}</Notice>
        </div>
      ) : null}

      <Field label="Amount received" htmlFor="amount" error={errors.amount}>
        <Input
          id="amount"
          name="amount"
          inputMode="decimal"
          placeholder="1250.00"
          invalid={Boolean(errors.amount)}
          required
        />
      </Field>

      <Field label="Date received" htmlFor="paidAt" error={errors.paidAt}>
        <Input
          id="paidAt"
          name="paidAt"
          type="date"
          defaultValue={today()}
          invalid={Boolean(errors.paidAt)}
          required
        />
      </Field>

      <Field
        label="Reference"
        htmlFor="reference"
        error={errors.reference}
        hint="From the bank statement or receipt. Must be unique."
      >
        <Input
          id="reference"
          name="reference"
          placeholder="BACS-2026-000512"
          invalid={Boolean(errors.reference)}
          required
        />
      </Field>

      <Field label="Method" htmlFor="method" error={errors.method}>
        <SelectField
          id="method"
          name="method"
          defaultValue="Bank transfer"
          options={[
            { value: "Bank transfer", label: "Bank transfer" },
            { value: "Card", label: "Card" },
            { value: "Cash", label: "Cash" },
            { value: "Sponsor / bursary", label: "Sponsor / bursary" },
            { value: "Student loan", label: "Student loan" },
          ]}
        />
      </Field>

      <Field label="Note" htmlFor="note" error={errors.note} className="sm:col-span-2">
        <Input
          id="note"
          name="note"
          placeholder="Optional — e.g. part payment agreed with the bursary office"
        />
      </Field>

      <div className="sm:col-span-2">
        <Submit label="Record payment" />
      </div>
    </form>
  );
}

/** Raising a charge: a resit fee, a penalty, an accommodation deposit. */
export function ChargeForm({ studentId }: { studentId: string }) {
  const [state, formAction] = useActionState(addCharge, IDLE);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="grid gap-4 p-4 sm:grid-cols-2">
      <input type="hidden" name="studentId" value={studentId} />

      {state.message ? (
        <div className="sm:col-span-2">
          <Notice tone={state.ok ? "sage" : "seal"}>{state.message}</Notice>
        </div>
      ) : null}

      <Field
        label="What is being charged"
        htmlFor="description"
        error={errors.description}
        className="sm:col-span-2"
      >
        <Input
          id="description"
          name="description"
          placeholder="Resit administration fee"
          invalid={Boolean(errors.description)}
          required
        />
      </Field>

      <Field label="Amount" htmlFor="charge-amount" error={errors.amount}>
        <Input
          id="charge-amount"
          name="amount"
          inputMode="decimal"
          placeholder="75.00"
          invalid={Boolean(errors.amount)}
          required
        />
      </Field>

      <Field
        label="Due date"
        htmlFor="dueDate"
        error={errors.dueDate}
        hint="The account falls into arrears the day after this date."
      >
        <Input
          id="dueDate"
          name="dueDate"
          type="date"
          defaultValue={today()}
          invalid={Boolean(errors.dueDate)}
          required
        />
      </Field>

      <div className="sm:col-span-2">
        <Submit label="Raise charge" />
      </div>
    </form>
  );
}
