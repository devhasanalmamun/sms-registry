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
      className="mt-2 w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      {pending ? "Switching…" : "Switch view"}
    </Button>
  );
}

/**
 * The role toggle, on the ink rail.
 *
 * Inverted styling: the rail is dark, so the trigger borrows the sidebar tokens
 * while the menu itself stays on paper like every other dropdown — the menu is
 * a surface, and surfaces in this design are paper.
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
      className="border-t border-sidebar-border px-5 py-4 text-sidebar-foreground"
    >
      <Label
        htmlFor="role"
        className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-sidebar-foreground/45"
      >
        Viewing as
      </Label>

      <Select name="role" defaultValue={value}>
        <SelectTrigger
          id="role"
          className="mt-1.5 w-full border-sidebar-border bg-sidebar-accent text-sidebar-foreground focus-visible:border-sidebar-ring focus-visible:ring-sidebar-ring/40 [&_svg]:text-sidebar-foreground/50"
        >
          <SelectValue />
        </SelectTrigger>
        {/* Wider than the rail: a name plus a student ID does not fit in 16rem. */}
        <SelectContent
          position="popper"
          className="max-h-[60vh] w-auto min-w-(--radix-select-trigger-width)"
        >
          <SelectGroup>
            <SelectItem value="staff">Registry staff</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel className="font-mono text-[0.625rem] uppercase tracking-[0.13em]">
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

      <p className="mt-2.5 text-[0.6875rem] leading-snug text-sidebar-foreground/40">
        {actingFirstName
          ? `Seeing exactly what ${actingFirstName} sees. Withheld results are not fetched.`
          : "Full Registry access. Stands in for staff sign-in."}
      </p>
    </form>
  );
}
