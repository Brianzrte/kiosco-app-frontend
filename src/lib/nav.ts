import { Role } from "./types";

export const NAV_ITEMS: { href: string; label: string; roles: Role[] }[] = [
  { href: "/", label: "Ventas", roles: ["cashier", "admin"] },
  { href: "/sales", label: "Historial", roles: ["admin", "cashier"] },
  { href: "/products", label: "Productos", roles: ["inventory", "admin"] },
  { href: "/inventory", label: "Inventario", roles: ["inventory", "admin"] },
  { href: "/categories", label: "Categorías", roles: ["admin"] },
  { href: "/users", label: "Usuarios", roles: ["admin"] },
  { href: "/reports", label: "Reportes", roles: ["admin"] },
];

export function homeFor(role: Role): string {
  return role === "inventory" ? "/products" : "/";
}
