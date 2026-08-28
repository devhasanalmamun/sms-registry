import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

/**
 * The Registry layer, composed on shadcn/ui.
 *
 * Everything under `src/components/ui` is shadcn as the CLI generated it, and
 * stays that way so it can be re-added or updated. This file is the layer above:
 * the handful of compositions this domain needs — a stamped status, a ruled
 * panel, a labelled field, a ledger cell — each built from those primitives
 * rather than from raw elements.
 */

/* -------------------------------------------------------------------------- */
/* Stamp — the signature element. Statuses are stamped, the way a paper file   */
/* in a records office is stamped. A shadcn Badge, squared off and set in mono. */
/* -------------------------------------------------------------------------- */

const stampTones = {
  neutral: "text-foreground/70",
  seal: "text-destructive bg-seal-tint",
  amber: "text-amber bg-amber-tint",
  sage: "text-sage bg-sage-tint",
  quiet: "text-muted-foreground",
} as const;

export function Stamp({
  tone = "neutral",
  struck = false,
  className,
  children,
}: {
  tone?: keyof typeof stampTones;
  struck?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "stamp h-auto rounded-none border-current px-1.5 py-0.5 text-[0.625rem]",
        stampTones[tone],
        // The one place a stamp is allowed to sit askew: an unreleased result.
        struck && "-rotate-4 border-2 px-2.5 py-1 text-xs tracking-[0.16em]",
        className,
      )}
    >
      {children}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

/** A shadcn Card, squared off and stripped of its padding: content rules to the edge. */
export function Panel({ className, ...rest }: ComponentProps<typeof Card>) {
  return (
    <Card
      {...rest}
      className={cn(
        "min-w-0 gap-0 rounded-none border border-border py-0 ring-0",
        className,
      )}
    />
  );
}

export function PanelHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    // The local --card-spacing keeps CardHeader's `[.border-b]:pb-` in step
    // with the py-3 this header actually wants.
    <CardHeader className="items-baseline border-b px-4 py-3 [--card-spacing:--spacing(3)]">
      <CardTitle className="font-display text-lg leading-tight">
        {title}
      </CardTitle>
      {hint ? <CardDescription className="text-xs">{hint}</CardDescription> : null}
      {action ? <CardAction>{action}</CardAction> : null}
    </CardHeader>
  );
}

/** A page title block. The eyebrow names the register you are looking at. */
export function PageHeader({
  eyebrow,
  title,
  lede,
  action,
}: {
  eyebrow: ReactNode;
  title: string;
  lede?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-input pb-4">
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1 font-display text-3xl leading-tight tracking-tight">
          {title}
        </h1>
        {lede ? <p className="mt-2 text-sm text-ink-soft">{lede}</p> : null}
      </div>
      {action}
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A link that looks like a button. shadcn's Button forwards its styling to a
 * child via `asChild`, so this stays one <a> — never an <a> inside a <button>.
 */
export function LinkButton({
  variant,
  size,
  className,
  ...rest
}: ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link {...rest} />
    </Button>
  );
}

/** A labelled control, with room for a hint or a validation message. */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label
        htmlFor={htmlFor}
        className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-soft"
      >
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export type Option = { value: string; label: string; hint?: string };

/**
 * The common case: one list of options inside a form. Wraps shadcn's Select so
 * a page does not have to assemble six components to render a dropdown.
 *
 * Radix renders a hidden native select when `name` is set, so this still posts
 * inside a plain <form>, including the GET filter form — the filtered URL stays
 * shareable and refresh-safe.
 */
export function SelectField({
  name,
  defaultValue,
  options,
  placeholder = "Choose…",
  id,
  required,
  invalid,
  groups,
}: {
  name: string;
  defaultValue?: string;
  options?: Option[];
  placeholder?: string;
  id?: string;
  required?: boolean;
  invalid?: boolean;
  groups?: { label: string; options: Option[] }[];
}) {
  const renderOption = (option: Option) => (
    <SelectItem key={option.value} value={option.value}>
      {option.label}
      {option.hint ? (
        <span className="ml-1.5 text-xs text-muted-foreground">{option.hint}</span>
      ) : null}
    </SelectItem>
  );

  return (
    <Select name={name} defaultValue={defaultValue} required={required}>
      <SelectTrigger id={id} aria-invalid={invalid || undefined} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper">
        {options?.map(renderOption)}
        {groups?.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel className="font-mono text-[0.625rem] uppercase tracking-[0.13em]">
              {group.label}
            </SelectLabel>
            {group.options.map(renderOption)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

/** For IDs and references: monospaced so they can be read aloud accurately. */
export function Code({ className, ...rest }: ComponentProps<"span">) {
  return (
    <span
      {...rest}
      className={cn(
        "whitespace-nowrap font-mono text-[0.8125rem] text-ink-soft",
        className,
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Empty and error states — an empty screen is an invitation to act.           */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="font-display text-base text-foreground">{title}</p>
      {children ? (
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          {children}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Notice({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "seal" | "amber" | "sage";
  children: ReactNode;
}) {
  const tones = {
    neutral: "border-input bg-background text-ink-soft",
    seal: "border-destructive/30 bg-seal-tint text-destructive",
    amber: "border-amber/30 bg-amber-tint text-amber",
    sage: "border-sage/30 bg-sage-tint text-sage",
  } as const;

  return (
    <p className={cn("border px-3 py-2 text-sm", tones[tone])} role="status">
      {children}
    </p>
  );
}

/**
 * A figure in the register summary: a number and what it counts. Deliberately
 * small — the dashboard leads with the work to be done, not with big numbers.
 */
export function Figure({
  value,
  label,
  tone = "neutral",
}: {
  value: ReactNode;
  label: string;
  tone?: "neutral" | "seal" | "amber" | "sage";
}) {
  const tones = {
    neutral: "text-foreground",
    seal: "text-destructive",
    amber: "text-amber",
    sage: "text-sage",
  } as const;

  return (
    <div className="px-4 py-3">
      <p className={cn("font-mono text-xl leading-none", tones[tone])}>{value}</p>
      <p className="mt-1.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
