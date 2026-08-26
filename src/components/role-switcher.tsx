"use client";

import { useFormStatus } from "react-dom";
import { switchRole } from "@/server/session-actions";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/select";

type StudentOption = { id: string; fullName: string; studentId: string };

function SwitchButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full border border-white/25 px-2 py-1.5 text-xs font-medium text-paper transition-colors hover:bg-white/10 disabled:opacity-60"
    >
      {pending ? "Switching…" : "Switch view"}
    </button>
  );
}

/**
 * The role toggle, on the ink rail.
 *
 * Inverted styling: the rail is dark, so the trigger borrows the rail's
 * palette while the menu itself stays on paper like every other dropdown —
 * the menu is a surface, and surfaces in this design are paper.
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
      className="border-t border-white/10 px-5 py-4 text-paper"
    >
      <label
        htmlFor="role"
        className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-white/45"
      >
        Viewing as
      </label>

      <Select name="role" defaultValue={value}>
        <SelectTrigger
          id="role"
          className="mt-1.5 border-white/20 bg-white/5 text-paper focus:ring-white/60 [&>svg]:text-white/50"
        >
          <SelectValue />
        </SelectTrigger>
        {/* Wider than the rail: a name plus a student ID does not fit in 16rem. */}
        <SelectContent className="max-h-[60vh] w-auto min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="staff">Registry staff</SelectItem>
          <SelectGroup>
            <SelectLabel>View as student</SelectLabel>
            {students.map((s) => (
              <SelectItem key={s.id} value={`student:${s.id}`} className="whitespace-nowrap">
                {s.fullName}
                <span className="ml-1.5 font-mono text-xs text-ink-faint">
                  {s.studentId}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <SwitchButton />

      <p className="mt-2.5 text-[0.6875rem] leading-snug text-white/40">
        {actingFirstName
          ? `Seeing exactly what ${actingFirstName} sees. Withheld results are not fetched.`
          : "Full Registry access. Stands in for staff sign-in."}
      </p>
    </form>
  );
}
