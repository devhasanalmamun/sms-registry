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
 * the compositions this domain needs, each built from those primitives.
 *
 * One typographic rule holds the whole interface together, and it is worth
 * stating because breaking it is what makes an interface shout: **mono capitals
 * label a column, and nothing else.** Page titles are Archivo. Field labels are
 * ordinary sentence-case text. Only a column heading and a status marker are
 * set in small mono capitals, so that treatment keeps its meaning.
 */

/* -------------------------------------------------------------------------- */
/* Marker — a status, in the vocabulary of a printed register.                 */
/* -------------------------------------------------------------------------- */

const tones = {
  neutral: "border-rule-hard text-graphite bg-transparent",
  flag: "border-flag/35 text-flag bg-flag-tint",
  watch: "border-watch/35 text-watch bg-watch-tint",
  clear: "border-clear/35 text-clear bg-clear-tint",
  quiet: "border-rule text-dim bg-transparent",
} as const;

export type Tone = keyof typeof tones;

export function Stamp({
  tone = "neutral",
  struck = false,
  className,
  children,
}: {
  tone?: Tone;
  struck?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto border px-1.5 py-0.5 text-xs font-medium leading-tight",
        tones[tone],
        struck && "border-2 px-2.5 py-1 text-sm",
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

/**
 * A section of the sheet.
 *
 * Not a card. A page made of boxes inside boxes asks the reader to work out the
 * nesting before they can read anything, and every screen here is one continuous
 * document. Sections are separated by a rule and a heading, which is how a
 * printed register does it.
 */
export function Panel({ className, ...rest }: ComponentProps<typeof Card>) {
  return (
    <Card
      {...rest}
      className={cn(
        "min-w-0 gap-0 rounded-none border-0 border-t border-rule-hard bg-transparent py-0 shadow-none ring-0",
        className,
      )}
    />
  );
}

/**
 * A section heading, with the sentence that says what the section is for.
 *
 * The hint is not decoration: "owing" and "in arrears" are different things in
 * this domain, and a reader who does not know that will misread the screen. So
 * the screen says it.
 */
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
    <CardHeader className="items-baseline px-0 pt-4 pb-3 [--card-spacing:--spacing(3)]">
      <CardTitle className="font-sans text-base font-semibold tracking-[-0.005em]">
        {title}
      </CardTitle>
      {hint ? (
        <CardDescription className="text-[0.8125rem] leading-snug text-graphite">
          {hint}
        </CardDescription>
      ) : null}
      {action ? <CardAction>{action}</CardAction> : null}
    </CardHeader>
  );
}

/**
 * The head of a page.
 *
 * `trail` puts you back where you came from in one click and, more importantly,
 * says where you are — a detail screen with no route back is the commonest way
 * to lose a reader. `reference` is the record this screen *is*: a student
 * number, a module code, set in mono because that is what you read down a phone.
 */
export function PageHeader({
  trail,
  reference,
  title,
  lede,
  action,
}: {
  trail?: { href: string; label: string };
  reference?: ReactNode;
  title: string;
  lede?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5">
      {trail ? (
        <Link
          href={trail.href}
          className="mb-3 inline-flex items-center gap-1 text-sm text-stamp hover:underline"
        >
          <span aria-hidden>&larr;</span> {trail.label}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {reference ? (
            <p className="mb-1.5 font-mono text-xs text-graphite">{reference}</p>
          ) : null}
          <h1 className="masthead text-[1.75rem] sm:text-[2.125rem]">{title}</h1>
        </div>
        {action}
      </div>

      {lede ? (
        <p className="mt-3 max-w-3xl text-[0.9375rem] leading-relaxed text-graphite">
          {lede}
        </p>
      ) : null}
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

/** A labelled control. The label is a label: sentence case, quiet, out of the way. */
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
      <Label htmlFor={htmlFor} className="text-[0.8125rem] font-medium text-graphite">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-flag" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
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
        <span className="ml-1.5 font-mono text-xs text-muted-foreground">
          {option.hint}
        </span>
      ) : null}
    </SelectItem>
  );

  return (
    <Select name={name} defaultValue={defaultValue} required={required}>
      <SelectTrigger
        id={id}
        aria-invalid={invalid || undefined}
        className="h-9 w-full bg-card"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper">
        {options?.map(renderOption)}
        {groups?.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel className="colhead text-dim">{group.label}</SelectLabel>
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
        "whitespace-nowrap font-mono text-[0.8125rem] text-graphite",
        className,
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Empty states — an empty screen is an invitation to act.                     */
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
      <p className="text-[0.9375rem] font-semibold">{title}</p>
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
  tone?: Tone;
  children: ReactNode;
}) {
  const noticeTones = {
    neutral: "border-rule-hard bg-band text-graphite",
    flag: "border-flag/30 bg-flag-tint text-flag",
    watch: "border-watch/30 bg-watch-tint text-watch",
    clear: "border-clear/30 bg-clear-tint text-clear",
    quiet: "border-rule bg-band text-dim",
  } as const;

  return (
    <p
      className={cn("border-l-2 px-3 py-2 text-sm", noticeTones[tone])}
      role="status"
    >
      {children}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* The footing — the totals line ruled across the bottom of a ledger page.     */
/* -------------------------------------------------------------------------- */

/**
 * Five equal boxes each shouting a number is a dashboard, and a registrar has
 * no use for one. A ledger states its position in a single ruled line, read
 * left to right as a sentence about the account, so that is what this is.
 */
export function Footing({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "tabular flex flex-wrap items-stretch border-y border-rule bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Figure({
  value,
  label,
  tone = "neutral",
}: {
  value: ReactNode;
  label: string;
  tone?: Tone;
}) {
  const figureTones = {
    neutral: "text-foreground",
    flag: "text-flag",
    watch: "text-watch",
    clear: "text-clear",
    quiet: "text-dim",
  } as const;

  return (
    <div className="grow border-r border-rule px-4 py-2.5 last:border-r-0">
      <p className="colhead text-dim">{label}</p>
      <p className={cn("mt-1 font-mono text-[0.9375rem]", figureTones[tone])}>
        {value}
      </p>
    </div>
  );
}
