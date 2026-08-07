"use client";

import { ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconFilter } from "@/components/ui/icons";

/** Secondary filters stay available on desktop and collapse behind one
 * keyboard-operable control on narrow screens. */
export function CollapsibleFilters({
  children,
  activeFilterCount = 0,
  label = "Mostrar filtros",
  open: controlledOpen,
  onOpenChange,
  className = "",
  mobileGridLayout = false,
}: {
  children: ReactNode;
  activeFilterCount?: number;
  label?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Lets a parent grid keep the trigger in its first row while the panel
   * expands across the following row. */
  mobileGridLayout?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const triggerRef = useRef<HTMLButtonElement>(null);

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <div
      className={
        mobileGridLayout
          ? "contents md:block md:w-auto"
          : `w-full md:w-auto ${open ? "col-span-2 md:col-span-1" : ""} ${className}`
      }
    >
      <div
        className={`${mobileGridLayout ? `col-start-2 row-start-1 ${className} ` : ""}flex justify-end md:hidden`}
      >
        <Button
          ref={triggerRef}
          type="button"
          variant="secondary"
          iconOnly
          title={label}
          aria-label={label}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <IconFilter className="size-4" />
          {activeFilterCount > 0 && (
            <span className="hidden rounded-full bg-primary-light px-2 py-0.5 text-xs text-primary">
              {activeFilterCount} activos
            </span>
          )}
        </Button>
      </div>
      <div
        className={`${mobileGridLayout ? "col-span-2 col-start-1 row-start-2 " : ""}grid transition-[opacity,transform] duration-[var(--motion-base)] ease-[var(--ease-standard)] motion-reduce:transition-none md:block md:opacity-100 ${open ? "grid-rows-[1fr] translate-y-0 opacity-100" : "grid-rows-[0fr] -translate-y-1 opacity-0 md:grid-rows-[1fr] md:translate-y-0"}`}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            close();
          }
        }}
      >
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden md:flex-row md:flex-wrap md:items-end md:gap-3">{children}</div>
      </div>
    </div>
  );
}
