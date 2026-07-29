import { redirect } from "next/navigation";
import { getSession, Session } from "./session";
import { homeFor } from "./nav";
import { Role } from "./types";
import { hasAnyRole } from "./roleAccess";

export { hasAnyRole, parseRoles } from "./roleAccess";

/** Server-side guard: redirects to /login without a session, or to the
 *  roles' home when none of them is allowed. UX only — the backend is
 *  the real enforcer. */
export async function requireRole(allowed: Role[]): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasAnyRole(session.roles, allowed)) redirect(homeFor(session.roles));
  return session;
}
