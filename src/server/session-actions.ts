"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ROLE_COOKIE } from "@/lib/session";
import { prisma } from "@/lib/db";

/**
 * Switches the acting role. Stands in for authentication, which the brief
 * makes optional — see src/lib/session.ts for why the read side is what
 * actually matters.
 *
 * The posted id is never trusted: an unknown student or staff member falls back
 * to the Registry view rather than leaving the session holding a reference to
 * somebody who does not exist.
 */

/** Where each role can actually start work. */
function landingFor(value: string) {
  if (value.startsWith("student:")) return "/me";
  if (value.startsWith("staff:")) return "/assessments";
  return "/";
}

export async function switchRole(formData: FormData) {
  const value = String(formData.get("role") ?? "registry");
  const store = await cookies();

  const set = (v: string) =>
    store.set(ROLE_COOKIE, v, { path: "/", httpOnly: true, sameSite: "lax" });

  let exists = true;
  if (value.startsWith("student:")) {
    exists = Boolean(
      await prisma.student.findUnique({
        where: { id: value.slice("student:".length) },
        select: { id: true },
      }),
    );
  } else if (value.startsWith("staff:")) {
    exists = Boolean(
      await prisma.staffMember.findUnique({
        where: { id: value.slice("staff:".length) },
        select: { id: true },
      }),
    );
  }

  if (!exists) {
    set("registry");
    revalidatePath("/", "layout");
    redirect("/");
  }

  set(value);
  revalidatePath("/", "layout");

  // Land on a page the new role can actually see, rather than a redirect from
  // whatever page they happened to be looking at.
  redirect(landingFor(value));
}
