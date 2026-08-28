"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * An entry in the index margin.
 *
 * Only the current section carries its description. Four permanent subtitles
 * are four lines of noise once you have used the thing twice; one, on the
 * section you are actually in, tells you what this screen is for.
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
        "block px-4 py-2 text-sm transition-colors",
        active
          ? "bg-ink font-medium text-paper"
          : "text-graphite hover:bg-card hover:text-foreground",
      )}
    >
      {label}
      {active ? (
        <span className="mt-0.5 block text-xs leading-snug text-paper/55">
          {note}
        </span>
      ) : null}
    </Link>
  );
}
