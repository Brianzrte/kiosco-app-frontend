"use client";

import Link from "next/link";
import { ComponentType, RefObject, SVGProps, useEffect, useRef } from "react";
import { IconLogout, IconX } from "@/components/ui/icons";

export type DrawerNavItem = {
  href: string;
  label: string;
  active: boolean;
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

/**
 * Mobile-only navigation drawer for `admin` (nav-mobile-admin-drawer). Reuses
 * the native `<dialog>` element for real focus-trapping and Escape-to-close
 * — the same technique `ui/Dialog.tsx` already validated — but positioned
 * as a right-anchored slide panel instead of a centered box, since this is
 * a menu list, not a confirmation dialog. Not built on top of `Dialog`
 * itself because that component's centered-box layout and title-only header
 * don't fit a nav list; the accessibility guarantees are reproduced here
 * instead of duplicated by copy-paste.
 *
 * Entrance uses the existing `.pop-in` keyframe (already
 * `prefers-reduced-motion`-safe) rather than a new slide-in animation —
 * CSS-before-Motion, reuse-before-new (`references/motion.md`).
 */
export function MobileNavDrawer({
  open,
  onClose,
  items,
  onLogout,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  items: DrawerNavItem[];
  onLogout: () => void;
  /** Focus returns here when the drawer closes via Escape or backdrop click. */
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function closeAndReturnFocus() {
    onClose();
    // Native <dialog> already returns focus to the element that had it
    // before showModal() in most browsers, but the trigger is a specific,
    // known target here — asserting it directly is more reliable than
    // depending on that implicit behavior across browsers.
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <dialog
      ref={ref}
      aria-label="Menú de navegación"
      onClose={closeAndReturnFocus}
      onCancel={(event) => {
        event.preventDefault();
        closeAndReturnFocus();
      }}
      onClick={(event) => {
        if (event.target === ref.current) closeAndReturnFocus();
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-[85%] max-w-xs overflow-y-auto border-l border-border bg-surface-raised p-0 shadow-soft-lg backdrop:bg-text-primary/40"
    >
      <div className="pop-in flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-border p-4">
          <p className="text-sm font-semibold tracking-tight text-text-primary">
            Menú
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Cerrar menú"
            onClick={closeAndReturnFocus}
            className="-m-2.5 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-app text-text-muted transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover hover:text-text-primary"
          >
            <IconX className="size-4.5" />
          </button>
        </div>

        <nav aria-label="Secciones" className="flex-1 overflow-y-auto p-2">
          <ul className="flex flex-col gap-1">
            {items.map(({ href, label, active, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={closeAndReturnFocus}
                  className={`flex min-h-11 items-center gap-3 rounded-app px-3 text-sm font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
                    active
                      ? "bg-primary-light text-primary"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  }`}
                >
                  {Icon && <Icon className="size-5 shrink-0" />}
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => {
              closeAndReturnFocus();
              onLogout();
            }}
            className="flex min-h-11 w-full items-center gap-3 rounded-app px-3 text-sm font-medium text-text-secondary transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover hover:text-text-primary"
          >
            <IconLogout className="size-5 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </dialog>
  );
}
