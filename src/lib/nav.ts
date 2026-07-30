import { Role } from "./types";

export const NAV_ITEMS: { href: string; label: string; roles: Role[] }[] = [
  { href: "/", label: "Ventas", roles: ["cashier", "admin"] },
  { href: "/sales", label: "Historial", roles: ["admin", "cashier"] },
  { href: "/products", label: "Productos", roles: ["inventory", "admin"] },
  { href: "/inventory", label: "Inventario", roles: ["inventory", "receiving", "admin"] },
  { href: "/purchasing", label: "Compras y recepción", roles: ["admin", "inventory", "receiving"] },
  { href: "/categories", label: "Categorías", roles: ["admin"] },
  { href: "/users", label: "Usuarios", roles: ["admin"] },
  { href: "/reports", label: "Reportes", roles: ["admin"] },
];

const HOME_PRIORITY: { role: Role; href: string }[] = [
  { role: "admin", href: "/" },
  { role: "cashier", href: "/" },
  { role: "receiving", href: "/purchasing" },
  { role: "inventory", href: "/products" },
];

export function navItemsFor(userRoles: Role[]) {
  return NAV_ITEMS.filter((item) =>
    item.roles.some((role) => userRoles.includes(role)),
  );
}

export function homeFor(roles: Role[]): string {
  return HOME_PRIORITY.find(({ role }) => roles.includes(role))?.href ?? "/login";
}
