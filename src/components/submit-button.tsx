"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * A submit button that admits it is working.
 *
 * Every mutation here is a round trip to the database, and on a dynamic page
 * that is most of a second. A button that neither disables nor changes while
 * that happens looks broken, and then the whole screen updates at once —
 * which reads as the page having reloaded, even though nothing navigated.
 *
 * `useFormStatus` reports the state of the nearest enclosing form, so this has
 * to be a child of the `<form>` rather than the element carrying the action.
 * That is the only reason it is a separate component.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...rest
}: ComponentProps<typeof Button> & {
  /** What to say while the action is in flight. Defaults to the label plus an ellipsis. */
  pendingLabel?: ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <Button {...rest} type="submit" disabled={pending || rest.disabled}>
      {pending ? (pendingLabel ?? <>{children}…</>) : children}
    </Button>
  );
}
