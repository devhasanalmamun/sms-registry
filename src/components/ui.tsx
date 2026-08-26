import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

/* -------------------------------------------------------------------------- */
/* Stamp — the signature element. Statuses are stamped, the way a paper file   */
/* in a records office is stamped.                                            */
/* -------------------------------------------------------------------------- */

const stampTones = {
  neutral: "text-ink-soft",
  seal: "text-seal bg-seal-tint",
  amber: "text-amber bg-amber-tint",
  sage: "text-sage bg-sage-tint",
  quiet: "text-ink-faint",
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
    <span
      className={cn("stamp", stampTones[tone], struck && "stamp-struck", className)}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

export function Panel({
  className,
  children,
  ...rest
}: ComponentProps<"section">) {
  return (
    <section
      {...rest}
      className={cn("min-w-0 border border-rule bg-card", className)}
    >
      {children}
    </section>
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
    <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule px-4 py-3">
      <div>
        <h2 className="font-display text-lg leading-tight">{title}</h2>
        {hint ? (
          <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>
        ) : null}
      </div>
      {action}
    </header>
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
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-rule-strong pb-4">
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

const buttonVariants = {
  primary:
    "bg-ink text-paper border-ink hover:bg-ink-soft disabled:bg-ink-faint disabled:border-ink-faint",
  secondary:
    "bg-card text-ink border-rule-strong hover:border-ink hover:bg-paper",
  danger: "bg-card text-seal border-seal/40 hover:bg-seal-tint hover:border-seal",
  ghost: "bg-transparent text-ink-soft border-transparent hover:text-ink hover:bg-paper",
} as const;

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: ComponentProps<"button"> & {
  variant?: keyof typeof buttonVariants;
  size?: "sm" | "md";
}) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm",
        buttonVariants[variant],
        className,
      )}
    />
  );
}

/** A link that looks like a button. Never nest an <a> inside a <button>. */
export function LinkButton({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: ComponentProps<typeof Link> & {
  variant?: keyof typeof buttonVariants;
  size?: "sm" | "md";
}) {
  return (
    <Link
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 border font-medium transition-colors",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm",
        buttonVariants[variant],
        className,
      )}
    />
  );
}

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
      <label
        htmlFor={htmlFor}
        className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-soft"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-seal" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

const controlBase =
  "w-full border bg-card px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ink";

export function Input({
  className,
  invalid,
  ...rest
}: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, invalid ? "border-seal" : "border-rule-strong", className)}
    />
  );
}

export function Select({
  className,
  invalid,
  ...rest
}: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select
      {...rest}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, invalid ? "border-seal" : "border-rule-strong", className)}
    />
  );
}

export function Textarea({
  className,
  ...rest
}: ComponentProps<"textarea">) {
  return (
    <textarea
      {...rest}
      className={cn(controlBase, "border-rule-strong", className)}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Tables — ruled rows, no zebra striping. Density is the point.               */
/* -------------------------------------------------------------------------- */

export function Table({ className, ...rest }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table {...rest} className={cn("w-full min-w-[42rem] text-sm", className)} />
    </div>
  );
}

export function Th({ className, numeric, ...rest }: ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      {...rest}
      className={cn(
        "border-b border-rule-strong px-4 py-2 font-mono text-[0.625rem] font-medium uppercase tracking-[0.13em] text-ink-faint",
        numeric ? "text-right" : "text-left",
        className,
      )}
    />
  );
}

export function Td({ className, numeric, ...rest }: ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      {...rest}
      className={cn(
        "border-b border-rule px-4 py-2.5 align-middle",
        numeric && "text-right font-mono",
        className,
      )}
    />
  );
}

/** For IDs and references: monospaced so they can be read aloud accurately. */
export function Code({ className, ...rest }: ComponentProps<"span">) {
  return (
    <span
      {...rest}
      className={cn("whitespace-nowrap font-mono text-[0.8125rem] text-ink-soft", className)}
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
      <p className="font-display text-base text-ink">{title}</p>
      {children ? (
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-faint">{children}</p>
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
    neutral: "border-rule-strong bg-paper text-ink-soft",
    seal: "border-seal/30 bg-seal-tint text-seal",
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
    neutral: "text-ink",
    seal: "text-seal",
    amber: "text-amber",
    sage: "text-sage",
  } as const;

  return (
    <div className="px-4 py-3">
      <p className={cn("font-mono text-xl leading-none", tones[tone])}>{value}</p>
      <p className="mt-1.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </p>
    </div>
  );
}
