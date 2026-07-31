"use client";

import Link from "next/link";
import { ComponentType, SVGProps, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Role } from "@/lib/types";
import { navItemsFor } from "@/lib/nav";
import { ROLE_META } from "@/lib/roleMeta";
import { MobileNavDrawer } from "@/components/shell/MobileNavDrawer";
import { CashierShiftClosingModal } from "@/components/shell/CashierShiftClosingModal";
import { CashierReconciliationIndicator } from "@/components/shell/CashierReconciliationIndicator";
import { CASH_CLOSING_STATUS_CHANGED } from "@/lib/cashClosing";
import {
  IconBox,
  IconCart,
  IconChart,
  IconHistory,
  IconLayers,
  IconLogout,
  IconMenu,
  IconTag,
  IconTruck,
  IconUsers,
} from "@/components/ui/icons";

// One icon per NAV_ITEMS href (lib/nav.ts) — purely decorative next to the
// label, so nothing here needs its own accessible name.
const NAV_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  "/": IconCart,
  "/sales": IconHistory,
  "/products": IconBox,
  "/inventory": IconLayers,
  "/purchasing": IconTruck,
  "/categories": IconTag,
  "/users": IconUsers,
  "/reports": IconChart,
};

function useActiveCheck() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const isActive = useActiveCheck();
  const items = navItemsFor(roles);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cashClosingOpen, setCashClosingOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const cashClosingTriggerRef = useRef<HTMLButtonElement>(null);

  // nav-mobile-admin-drawer: `admin` sees all 8 NAV_ITEMS (product decision
  // — POS/"Ventas" is desktop/tablet-fija-only for this role; a bottom tab
  // bar with 8 items was already flagged as "too much" by product). Any
  // role set that includes `admin` gets the drawer instead of the bottom
  // tab bar, even combined with another role (e.g. admin+cashier) — the
  // crowding problem the drawer solves doesn't go away just because one of
  // the roles would still want "Ventas"; that case only changes *which*
  // items the drawer lists (see mobileNavItems below), not whether it's
  // used. Roles without `admin` (cashier, inventory, receiving — 2 items
  // each) are completely unaffected: same bottom tab bar as before.
  const isAdmin = roles.includes("admin");
  const isCashier = roles.includes("cashier");
  const useDrawerNav = isAdmin;
  // "Ventas" drops out of the mobile menu when the only reason to see it
  // would be the admin role; a co-occurring cashier role keeps it (product
  // decision above).
  const mobileNavItems = (
    isAdmin && !isCashier ? items.filter((item) => item.href !== "/") : items
  ).map((item) => ({
    href: item.href,
    label: item.label,
    active: isActive(item.href),
    Icon: NAV_ICONS[item.href],
  }));

  async function logout() {
    await fetch("/api/session", { method: "DELETE" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  function closeCashClosing() {
    setCashClosingOpen(false);
    requestAnimationFrame(() => cashClosingTriggerRef.current?.focus());
  }

  return (
    <>
      <header className="border-b border-border bg-surface shadow-soft">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-3 py-3 md:gap-6 md:px-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="flex size-8 items-center justify-center rounded-tight bg-primary text-sm font-bold text-text-inverse">
              M
            </span>
            <span className="text-base font-semibold tracking-tight text-text-primary">
              Mini Moni
            </span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {items.map((item) => {
              const ItemIcon = NAV_ICONS[item.href];
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  className={`flex shrink-0 items-center gap-0 whitespace-nowrap rounded-app px-2 py-1.5 text-sm font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] xl:gap-1.5 xl:px-3 ${
                    active
                      ? "bg-primary-light text-primary"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  }`}
                >
                  {ItemIcon && <ItemIcon className="size-4 shrink-0" />}
                  <span className="hidden xl:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <span className="ml-auto hidden rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-medium text-text-secondary md:ml-0 md:inline-block">
            {roles.map((role) => ROLE_META[role].label).join(" · ")}
          </span>
          {isCashier && (
            <div className="ml-auto shrink-0 md:ml-0">
              <CashierReconciliationIndicator
                onOpenClosing={() => setCashClosingOpen(true)}
                triggerRef={cashClosingTriggerRef}
              />
            </div>
          )}
          {useDrawerNav && (
            <button
              ref={menuTriggerRef}
              type="button"
              aria-label="Abrir menú de navegación"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className="ml-auto flex min-h-11 min-w-11 items-center justify-center rounded-app text-text-secondary transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover hover:text-text-primary md:hidden"
            >
              <IconMenu className="size-5 shrink-0" />
            </button>
          )}
          <button
            onClick={logout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className={`ml-auto shrink-0 items-center gap-0 whitespace-nowrap rounded-app px-2 py-1.5 text-sm font-medium text-text-secondary transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover hover:text-text-primary md:ml-0 md:flex xl:gap-1.5 xl:px-3 ${
              useDrawerNav ? "hidden" : "flex"
            }`}
          >
            <IconLogout className="size-4 shrink-0" />
            <span className="hidden xl:inline">Cerrar sesión</span>
          </button>
        </div>
      </header>

      {useDrawerNav ? (
        <MobileNavDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          items={mobileNavItems}
          onLogout={logout}
          triggerRef={menuTriggerRef}
        />
      ) : (
        /* Mobile: fixed bottom tab bar, thumb-reachable. Only rendered for
           roles without `admin` (cashier, inventory, receiving — 2 items
           each): admin uses the drawer above instead. Icons render at size-5
           here vs. size-4 on the desktop nav above — a deliberately larger
           touch target for the finger-driven tab bar, not a drift. */
        <nav
          aria-label="Secciones"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-soft-lg md:hidden"
        >
          <ul className="flex overflow-x-auto">
            {items.map((item) => {
              const ItemIcon = NAV_ICONS[item.href];
              const active = isActive(item.href);
              return (
                <li key={item.href} className="min-w-17 flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
                      active
                        ? "text-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {ItemIcon && <ItemIcon className="size-5 shrink-0" />}
                    <span
                      className={`truncate rounded-full px-2 ${
                        active ? "bg-primary-light" : ""
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      {cashClosingOpen && (
        <CashierShiftClosingModal
          onClose={closeCashClosing}
          onSaved={() => window.dispatchEvent(new Event(CASH_CLOSING_STATUS_CHANGED))}
        />
      )}
    </>
  );
}
