import { redirect } from "next/navigation";
import { getSession, Session } from "./session";
import { homeFor } from "./nav";
import { Role } from "./types";

/** Server-side guard: redirects to /login without a session, or to the
 *  role's home when the role is not allowed. UX only — the backend is
 *  the real enforcer. */
export async function requireRole(roles: Role[]): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!roles.includes(session.role)) redirect(homeFor(session.role));
  return session;
}
