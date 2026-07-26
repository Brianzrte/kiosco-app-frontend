import { cookies } from "next/headers";
import { Role } from "./types";

export const TOKEN_COOKIE = "kiosco_token";
export const ROLE_COOKIE = "kiosco_role";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type Session = { token: string; role: Role };

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  const role = store.get(ROLE_COOKIE)?.value as Role | undefined;
  if (!token || !role) return null;
  return { token, role };
}
