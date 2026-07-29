import { Role } from "./types";

const KNOWN_ROLES: Role[] = ["admin", "cashier", "receiving", "inventory"];

export function hasAnyRole(userRoles: Role[], allowed: Role[]): boolean {
  return userRoles.some((role) => allowed.includes(role));
}

export function parseRoles(raw: string | undefined): Role[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((role) => role.trim())
    .filter((role): role is Role => KNOWN_ROLES.includes(role as Role));
}
