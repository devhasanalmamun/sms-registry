"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  programmes,
  statuses,
  filtered,
}: {
  search: string;
  programmeId: string;
  status: string;
  programmes: Option[];
  statuses: Option[];
  filtered: boolean;
}) {
  return (
    <form
      method="get"
      className="grid items-start gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]"
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

      {/*
       * The buttons sit on the inputs' line, not below them. Bottom-aligning
       * them instead drops them a hint's height under the Search box, which
       * reads as a second row of controls. The blank label reserves the same
       * strip the field labels occupy, so everything starts level.
       */}
      <div className="flex flex-col gap-1.5">
        <span aria-hidden className="invisible text-[0.8125rem] font-medium">
          Apply
        </span>
        <div className="flex gap-2">
          <Button type="submit" variant="default">
            Apply
          </Button>
          {filtered ? (
            <LinkButton variant="ghost" href="/students">
              Clear
            </LinkButton>
          ) : null}
        </div>
      </div>
    </form>
  );
}
