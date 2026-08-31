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
type StaffOption = {
  id: string;
  fullName: string;
  title: string | null;
  department: string | null;
};

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

/** What the current role can and cannot do, in one line, at the point of choosing. */
function describe(role: "registry" | "staff" | "student", name: string | null) {
  if (role === "student") {
    return `Seeing exactly what ${name ?? "this student"} sees. Withheld results are not fetched.`;
  }
  if (role === "staff") {
    return "Sets and marks assessments, and releases results. No access to the fees ledger.";
  }
  return "Enrolment and fees. Assessments and results belong to teaching staff.";
}

/**
 * Who you are reading the register as.
 *
 * Three roles, because the institution has three jobs: the Registry office, the
 * staff who teach and mark, and the student. It sits at the foot of the margin,
 * under a rule and pinned to the bottom edge, so it is always on screen without
 * standing between the reader and the navigation.
 *
 * The line underneath says what the choice actually does, because "role toggle"
 * in a demo usually means the same page with things hidden, and here it does
 * not: a student's view never fetches a withheld mark in the first place, and a
 * registrar's never fetches a marksheet.
 */
export function RoleSwitcher({
  value,
  students,
  staff,
  actingName,
  role,
}: {
  value: string;
  students: StudentOption[];
  staff: StaffOption[];
  actingName: string | null;
  role: "registry" | "staff" | "student";
}) {
  return (
    <form
      action={switchRole}
      className="mt-auto border-t border-rule-hard bg-card px-4 py-3.5"
    >
      <Label htmlFor="role" className="text-xs font-semibold text-graphite">
        You are viewing this as
      </Label>

      <Select name="role" defaultValue={value}>
        <SelectTrigger id="role" className="mt-1.5 h-9 w-full bg-card">
          <SelectValue />
        </SelectTrigger>
        {/* Wider than the margin: a name plus a number does not fit in 15rem. */}
        <SelectContent
          position="popper"
          className="max-h-[60vh] w-auto min-w-(--radix-select-trigger-width)"
        >
          <SelectGroup>
            <SelectItem value="registry">Registry office</SelectItem>
          </SelectGroup>

          <SelectGroup>
            <SelectLabel className="colhead text-dim">
              View as teaching staff
            </SelectLabel>
            {staff.map((s) => (
              <SelectItem
                key={s.id}
                value={`staff:${s.id}`}
                className="whitespace-nowrap"
              >
                {s.title ? `${s.title} ${s.fullName}` : s.fullName}
                {s.department ? (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {s.department}
                  </span>
                ) : null}
              </SelectItem>
            ))}
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
        {describe(role, actingName)}
      </p>
    </form>
  );
}
