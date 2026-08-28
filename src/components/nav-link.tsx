"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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
        "block border-l-2 px-3 py-2 transition-colors",
        active
          ? "border-sidebar-primary bg-sidebar-accent text-sidebar-foreground"
          : "border-transparent text-sidebar-foreground/70 hover:border-sidebar-border hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <span className="block text-sm font-medium">{label}</span>
      <span className="mt-0.5 block text-[0.6875rem] leading-tight text-sidebar-foreground/40">
        {note}
      </span>
    </Link>
  );
}
