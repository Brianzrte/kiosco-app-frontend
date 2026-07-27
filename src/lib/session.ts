import { cookies } from "next/headers";
import { Role } from "./types";

export const TOKEN_COOKIE = "kiosco_token";
export const ROLE_COOKIE = "kiosco_role";
export const USERNAME_COOKIE = "kiosco_username";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type Session = { token: string; role: Role; username?: string };

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  const role = store.get(ROLE_COOKIE)?.value as Role | undefined;
  const username = store.get(USERNAME_COOKIE)?.value;
  if (!token || !role) return null;
  return { token, role, username };
}
