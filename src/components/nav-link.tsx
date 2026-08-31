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
  siblings = [],
}: {
  href: string;
  label: string;
  note: string;
  /** The other entries in this nav. See `isActive`. */
  siblings?: readonly string[];
}) {
  const pathname = usePathname();

  return (
    <Link
      href={href}
      aria-current={isActive(pathname, href, siblings) ? "page" : undefined}
      className={cn(
        "block border-l-[3px] py-2 pl-3 pr-4 transition-colors",
        isActive(pathname, href, siblings)
          ? "border-stamp bg-card"
          : "border-transparent hover:border-rule-hard hover:bg-card/70",
      )}
    >
      <span
        className={cn(
          "block text-sm",
          isActive(pathname, href, siblings)
            ? "font-semibold text-stamp"
            : "font-medium text-foreground",
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

function covers(pathname: string, href: string) {
  // "/" and "/me" would otherwise cover the whole site and every /me/* page.
  if (href === "/" || href === "/me") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Longest match wins.
 *
 * "My assessments" (`/assessments`) covers the whole teaching section, and "Set
 * an assessment" (`/assessments/new`) sits inside it — so on the new-assessment
 * page both entries matched and both lit up, which tells the reader nothing
 * about where they are. Only the most specific entry is current.
 */
function isActive(pathname: string, href: string, siblings: readonly string[]) {
  if (!covers(pathname, href)) return false;
  return !siblings.some(
    (other) => other !== href && other.length > href.length && covers(pathname, other),
  );
}
