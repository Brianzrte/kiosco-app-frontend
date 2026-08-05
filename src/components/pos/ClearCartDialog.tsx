"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * Confirms before discarding every cart line, including in-progress line
 * edits (weight/precio real not yet valid) — design.md, Decisión 13. Built
 * on the repo's existing `Dialog`; cancel (button, Esc, backdrop) returns
 * focus to the button that opened it via the native `<dialog>` behavior
 * already provided by `Dialog`. Confirming instead moves focus to the scan
 * field — the caller's `onConfirm` is responsible for that (same `refocus`
 * already used elsewhere in the POS).
 */
export function ClearCartDialog({
  open,
  lineCount,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  lineCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} title="Vaciar carrito" onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Se van a eliminar los {lineCount} producto
          {lineCount === 1 ? "" : "s"} del carrito, incluida cualquier edición
          de peso o precio sin confirmar. Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Vaciar carrito
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
