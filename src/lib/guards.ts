import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/**
 * Staff pages call this first. A student who navigates to a staff URL is sent
 * to their own view rather than shown an error — the URL is not a secret, the
 * data behind it is.
 */
export async function staffOnly() {
  const session = await getSession();
  if (session.role === "student") redirect("/me");
  return session;
}
