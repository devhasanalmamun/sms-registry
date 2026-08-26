"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

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
          ? "border-paper bg-white/10 text-paper"
          : "border-transparent text-white/70 hover:border-white/30 hover:bg-white/5 hover:text-paper",
      )}
    >
      <span className="block text-sm font-medium">{label}</span>
      <span className="mt-0.5 block text-[0.6875rem] leading-tight text-white/40">
        {note}
      </span>
    </Link>
  );
}
