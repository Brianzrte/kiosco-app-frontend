"use client";

import { ReactNode, useEffect, useRef } from "react";

export function Dialog({
  open,
  title,
  onClose,
  dismissible = true,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  dismissible?: boolean;
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
      className="m-auto w-full max-w-md rounded-app border border-border bg-surface p-0 shadow-soft-lg backdrop:bg-text-primary/40"
    >
      <div className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
