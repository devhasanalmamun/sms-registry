"use client";

import { Button, Field, Input, LinkButton } from "@/components/ui";
import { SelectField, type Option } from "@/components/select";

/**
 * The register's filter bar.
 *
 * Still a plain GET form: the resulting URL is shareable and survives a
 * refresh, which matters because Registry staff send each other links to
 * filtered lists. Only the dropdowns are ours rather than the browser's.
 */
export function StudentFilters({
  search,
  programmeId,
  status,
  overdueOnly,
  programmes,
  statuses,
  filtered,
}: {
  search: string;
  programmeId: string;
  status: string;
  overdueOnly: boolean;
  programmes: Option[];
  statuses: Option[];
  filtered: boolean;
}) {
  return (
    <form
      method="get"
      className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]"
    >
      <Field label="Search" htmlFor="q" hint="Name, student ID, email or programme">
        <Input
          id="q"
          name="q"
          defaultValue={search}
          placeholder="Okafor, SMS-2026-0001, msc…"
        />
      </Field>

      <Field label="Programme" htmlFor="programme">
        <SelectField
          id="programme"
          name="programme"
          defaultValue={programmeId || "any"}
          options={[{ value: "any", label: "Any programme" }, ...programmes]}
        />
      </Field>

      <Field label="Status" htmlFor="status">
        <SelectField
          id="status"
          name="status"
          defaultValue={status}
          options={statuses}
        />
      </Field>

      <div className="flex items-end gap-2">
        <Button type="submit" variant="primary">
          Apply
        </Button>
        {filtered ? (
          <LinkButton variant="ghost" href="/students">
            Clear
          </LinkButton>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-soft sm:col-span-2 lg:col-span-4">
        <input
          type="checkbox"
          name="arrears"
          value="1"
          defaultChecked={overdueOnly}
          className="size-4 accent-[#7a2e2e]"
        />
        Only students in arrears
        <span className="text-xs text-ink-faint">
          (a charge past its due date, not simply a balance owing)
        </span>
      </label>
    </form>
  );
}
