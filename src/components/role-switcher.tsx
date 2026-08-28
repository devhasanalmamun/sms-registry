"use client";

import { useFormStatus } from "react-dom";
import { switchRole } from "@/server/session-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StudentOption = { id: string; fullName: string; studentId: string };

function SwitchButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      className="mt-2 w-full"
    >
      {pending ? "Switching…" : "Switch view"}
    </Button>
  );
}

/**
 * Who you are reading the register as.
 *
 * This stands in for signing in, and it sits above the navigation because it
 * decides what the navigation contains. The line underneath says what the
 * choice actually does, because "role toggle" in a demo usually means the same
 * page with things hidden, and here it does not: a student's view never fetches
 * a withheld mark in the first place.
 */
export function RoleSwitcher({
  value,
  students,
  actingFirstName,
}: {
  value: string;
  students: StudentOption[];
  actingFirstName?: string;
}) {
  return (
    <form
      action={switchRole}
      className="border-b border-rule-hard bg-card px-4 py-3.5"
    >
      <Label htmlFor="role" className="text-xs font-semibold text-graphite">
        You are viewing this as
      </Label>

      <Select name="role" defaultValue={value}>
        <SelectTrigger id="role" className="mt-1.5 h-9 w-full bg-card">
          <SelectValue />
        </SelectTrigger>
        {/* Wider than the margin: a name plus a student number does not fit in 15rem. */}
        <SelectContent
          position="popper"
          className="max-h-[60vh] w-auto min-w-(--radix-select-trigger-width)"
        >
          <SelectGroup>
            <SelectItem value="staff">Registry staff</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel className="colhead text-dim">
              View as student
            </SelectLabel>
            {students.map((s) => (
              <SelectItem
                key={s.id}
                value={`student:${s.id}`}
                className="whitespace-nowrap"
              >
                {s.fullName}
                <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                  {s.studentId}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <SwitchButton />

      <p className="mt-2.5 text-xs leading-snug text-muted-foreground">
        {actingFirstName
          ? `Seeing exactly what ${actingFirstName} sees. Withheld results are not fetched.`
          : "Full Registry access. Stands in for staff sign-in."}
      </p>
    </form>
  );
}
