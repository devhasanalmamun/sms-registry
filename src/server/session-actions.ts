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
 */
export async function switchRole(formData: FormData) {
  const value = String(formData.get("role") ?? "staff");
  const store = await cookies();

  if (value.startsWith("student:")) {
    const id = value.slice("student:".length);
    // Never trust the posted id: confirm the student exists before adopting it.
    const student = await prisma.student.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!student) {
      store.set(ROLE_COOKIE, "staff", { path: "/", httpOnly: true, sameSite: "lax" });
      revalidatePath("/", "layout");
      redirect("/");
    }
  }

  store.set(ROLE_COOKIE, value, { path: "/", httpOnly: true, sameSite: "lax" });
  revalidatePath("/", "layout");

  // Land on a page the new role can actually see, rather than a permission
  // error on whatever page they happened to be looking at.
  redirect(value.startsWith("student:") ? "/me" : "/");
}
