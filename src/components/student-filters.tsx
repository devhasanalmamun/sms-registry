"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, LinkButton, type Option, SelectField } from "@/components/registry";

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
        <Button type="submit" variant="default">
          Apply
        </Button>
        {filtered ? (
          <LinkButton variant="ghost" href="/students">
            Clear
          </LinkButton>
        ) : null}
      </div>

      <Label className="gap-2 text-sm font-normal text-graphite sm:col-span-2 lg:col-span-4">
        <Checkbox name="arrears" value="1" defaultChecked={overdueOnly} />
        Only students in arrears
        <span className="text-xs text-muted-foreground">
          (a charge past its due date, not simply a balance owing)
        </span>
      </Label>
    </form>
  );
}
