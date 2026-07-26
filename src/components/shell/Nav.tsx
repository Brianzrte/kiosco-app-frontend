"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Role } from "@/lib/types";
import { NAV_ITEMS } from "@/lib/nav";

const roleLabels: Record<Role, string> = {
  admin: "Administración",
  cashier: "Caja",
  inventory_manager: "Inventario",
};

export function Nav({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  async function logout() {
    await fetch("/api/session", { method: "DELETE" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/" className="text-base font-semibold text-primary">
          Kiosco
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {items.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-app px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary-light text-primary"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <span className="text-xs text-text-secondary">{roleLabels[role]}</span>
        <button
          onClick={logout}
          className="rounded-app px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
