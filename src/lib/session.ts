import { cookies } from "next/headers";
import { parseRoles } from "./roleAccess";
import { Role } from "./types";

export const TOKEN_COOKIE = "kiosco_token";
export const ROLES_COOKIE = "kiosco_roles";
export const USERNAME_COOKIE = "kiosco_username";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type Session = { token: string; roles: Role[]; username?: string };

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  const rawRoles = store.get(ROLES_COOKIE)?.value;
  const username = store.get(USERNAME_COOKIE)?.value;
  if (!token || !rawRoles) return null;
  const roles = parseRoles(rawRoles);
  if (roles.length === 0) return null;
  return { token, roles, username };
}
