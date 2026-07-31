"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { IconSearch } from "@/components/ui/icons";

export function CollapsibleSearch({
  open,
  onOpenChange,
  children,
  label = "Buscar",
  mobileGridLayout = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  label?: string;
  /** Lets a parent grid keep the trigger in its first row while the panel
   * expands across the following row. */
  mobileGridLayout?: boolean;
}) {
  return (
    <div
      className={
        mobileGridLayout
          ? "contents md:flex md:min-w-0 md:flex-1"
          : `min-w-0 flex-1 ${open ? "basis-full col-span-2 md:basis-auto md:col-span-1" : "basis-auto"}`
      }
    >
      <Button
        type="button"
        variant="secondary"
        iconOnly
        title={label}
        aria-label={label}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={mobileGridLayout ? "col-start-1 row-start-1 md:hidden" : "md:hidden"}
      >
        <IconSearch className="size-4" />
      </Button>
      <div
        className={`${mobileGridLayout ? "col-span-2 col-start-1 row-start-2 " : ""}grid transition-[grid-template-rows,opacity] duration-[var(--motion-base)] ease-[var(--ease-standard)] md:flex md:min-w-0 md:flex-1 md:opacity-100 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 md:grid-rows-[1fr]"}`}
      >
        <div className="min-h-0 overflow-hidden md:overflow-visible">{children}</div>
      </div>
    </div>
  );
}
