"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * An entry in the index margin.
 *
 * Every entry carries its description, not just the active one. Hiding them
 * saved four lines and cost a first-time reader the answer to "what is behind
 * this link" — which is the whole question navigation exists to answer.
 *
 * The current section is marked by a rule down its left edge and the house
 * colour, so it reads as selected without a filled block.
 */
export function NavLink({
  href,
  label,
  note,
}: {
  href: string;
  label: string;
  note: string;
}) {
  const pathname = usePathname();
  // "/" and "/me" must match exactly; everything else matches its subtree.
  const active =
    href === "/" || href === "/me"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block border-l-[3px] py-2 pl-3 pr-4 transition-colors",
        active
          ? "border-stamp bg-card"
          : "border-transparent hover:border-rule-hard hover:bg-card/70",
      )}
    >
      <span
        className={cn(
          "block text-sm",
          active ? "font-semibold text-stamp" : "font-medium text-foreground",
        )}
      >
        {label}
      </span>
      <span className="mt-0.5 block text-xs leading-snug text-graphite">
        {note}
      </span>
    </Link>
  );
}
