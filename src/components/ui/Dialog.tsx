"use client";

import { ReactNode, useEffect, useRef } from "react";
import { IconX } from "@/components/ui/icons";

export function Dialog({
  open,
  title,
  onClose,
  dismissible = true,
  className = "",
  contentClassName = "",
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  dismissible?: boolean;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(event) => {
        if (!dismissible) {
          event.preventDefault();
          return;
        }
        onClose();
      }}
      onClick={(e) => {
        if (dismissible && e.target === ref.current) onClose();
      }}
      className={`m-auto max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-app border border-border bg-surface-raised p-0 shadow-soft-lg backdrop:bg-text-primary/40 ${className}`}
    >
      <div className={`p-6 ${contentClassName}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {dismissible && (
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="-m-2.5 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-app text-text-muted transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover hover:text-text-primary md:-m-1.5 md:min-h-9 md:min-w-9"
            >
              <IconX className="size-4.5" />
            </button>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}
