"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Role } from "@/lib/types";
import { NAV_ITEMS } from "@/lib/nav";

const roleLabels: Record<Role, string> = {
  admin: "Administración",
  cashier: "Caja",
  inventory: "Inventario",
};

function useActiveCheck() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav({ role }: { role: Role }) {
  const router = useRouter();
  const isActive = useActiveCheck();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  async function logout() {
    await fetch("/api/session", { method: "DELETE" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:gap-6 md:px-6">
          <Link href="/" className="text-base font-semibold text-primary">
            Mini Moni
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-app px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-primary-light text-primary"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto text-xs text-text-secondary md:ml-0">
            {roleLabels[role]}
          </span>
          <button
            onClick={logout}
            className="rounded-app px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Mobile: fixed bottom tab bar, thumb-reachable */}
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="flex">
          {items.map((item) => (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex min-h-12 items-center justify-center px-1 text-xs font-medium transition-colors ${
                  isActive(item.href)
                    ? "text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <span
                  className={`truncate rounded-full px-2.5 py-1 ${
                    isActive(item.href) ? "bg-primary-light" : ""
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
