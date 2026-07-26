import { Role } from "./types";

export const NAV_ITEMS: { href: string; label: string; roles: Role[] }[] = [
  { href: "/", label: "Ventas", roles: ["cashier", "admin"] },
  { href: "/products", label: "Productos", roles: ["inventory_manager", "admin"] },
  { href: "/inventory", label: "Inventario", roles: ["inventory_manager", "admin"] },
  { href: "/categories", label: "Categorías", roles: ["admin"] },
  { href: "/reports", label: "Reportes", roles: ["admin"] },
];

export function homeFor(role: Role): string {
  return role === "inventory_manager" ? "/products" : "/";
}
