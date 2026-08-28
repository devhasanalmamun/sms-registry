"use client";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/registry";

/**
 * Errors explain what happened and what to do about it. They do not apologise,
 * and they are never vague — a Registry administrator needs to know whether to
 * retry, or to call someone.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Panel className="mx-auto max-w-xl px-6 py-10 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-2 font-display text-2xl">This page could not be loaded.</h1>
      <p className="mt-3 text-sm text-ink-soft">
        Nothing was saved or changed. Try again — if it keeps happening, the
        database may be unreachable; check that it is running and that
        <code className="mx-1 font-mono text-xs">DATABASE_URL</code> is correct.
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex justify-center">
        <Button variant="default" onClick={reset}>
          Try again
        </Button>
      </div>
    </Panel>
  );
}
