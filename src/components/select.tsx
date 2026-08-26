"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/components/ui";

/**
 * Select, in the shadcn/ui shape: Radix primitives, styled with this project's
 * own tokens rather than shadcn's default palette.
 *
 * A native <select> renders as an operating-system menu — grey, system-font,
 * and completely outside the design. Every other control here is ours, so the
 * dropdowns are too.
 *
 * Radix renders a hidden native select when `name` is set, so these still post
 * inside a plain <form>, including the GET filter form — the filtered URL stays
 * shareable and refresh-safe. The trade-off is that, unlike a native <select>,
 * the menu needs JavaScript to open.
 */

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  invalid,
  ...rest
}: ComponentProps<typeof SelectPrimitive.Trigger> & { invalid?: boolean }) {
  return (
    <SelectPrimitive.Trigger
      {...rest}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex w-full items-center justify-between gap-2 border bg-card px-2.5 py-1.5 text-left text-sm text-ink",
        "focus:outline-none focus:ring-1 focus:ring-ink",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "data-[placeholder]:text-ink-faint",
        invalid ? "border-seal" : "border-rule-strong",
        className,
      )}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-ink-faint" aria-hidden />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = "popper",
  ...rest
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        {...rest}
        position={position}
        className={cn(
          "relative z-50 max-h-72 min-w-[8rem] overflow-hidden border border-rule-strong bg-card text-ink shadow-[0_8px_24px_-12px_rgba(22,32,43,0.35)]",
          position === "popper" &&
            "w-[var(--radix-select-trigger-width)] translate-y-1",
          className,
        )}
      >
        <SelectPrimitive.Viewport className="p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectLabel({
  className,
  ...rest
}: ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      {...rest}
      className={cn(
        "px-2 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.13em] text-ink-faint",
        className,
      )}
    />
  );
}

export function SelectItem({
  className,
  children,
  ...rest
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      {...rest}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 py-1.5 pl-7 pr-2 text-sm outline-none",
        "data-[highlighted]:bg-paper data-[highlighted]:text-ink",
        "data-[state=checked]:font-medium",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-3.5" aria-hidden />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({
  className,
  ...rest
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      {...rest}
      className={cn("my-1 h-px bg-rule", className)}
    />
  );
}

/* -------------------------------------------------------------------------- */

export type Option = { value: string; label: string; hint?: string };

/**
 * The common case: one list of options inside a form. Wraps the primitives so
 * a page does not have to assemble six components to render a dropdown.
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
        <span className="ml-1.5 text-xs text-ink-faint">{option.hint}</span>
      ) : null}
    </SelectItem>
  );

  return (
    <Select name={name} defaultValue={defaultValue} required={required}>
      <SelectTrigger id={id} invalid={invalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options?.map(renderOption)}
        {groups?.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.options.map(renderOption)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
