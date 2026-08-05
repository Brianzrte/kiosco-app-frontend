"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { formatMoney } from "@/lib/money";
import { summarizePurchaseOrderDraft } from "@/lib/purchasing";
import { Product } from "@/lib/types";
import { DraftItem } from "@/components/purchasing/PurchaseOrderItemRow";

export function PurchaseOrderConfirmationModal({
  open,
  items,
  products,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  items: DraftItem[];
  products: Product[];
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const summary = summarizePurchaseOrderDraft(
    items.map((item) => ({
      productId: item.productId,
      productName:
        products.find((product) => product.id === item.productId)?.name ??
        item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost.trim(),
    })),
  );

  return (
    <Dialog
      open={open}
      title="Confirmar pedido"
      onClose={onClose}
      dismissible={!pending}
      className="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Revisá los productos, cantidades y costos antes de crear el pedido.
        </p>
        <ul className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto rounded-app border border-border">
          {summary.lines.map((line) => (
            <li
              key={line.productId}
              className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
            >
              <div>
                <p className="font-medium text-text-primary">
                  {line.productName}
                </p>
                <p className="text-text-secondary">
                  {line.quantity} × {formatMoney(line.unitCost)}
                </p>
              </div>
              <p className="num font-medium text-text-primary">
                {formatMoney(line.subtotal)}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <span className="font-medium text-text-primary">Total</span>
          <span className="num text-lg font-semibold text-text-primary">
            {formatMoney(summary.total)}
          </span>
        </div>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="button" pending={pending} onClick={onConfirm}>
            Confirmar pedido
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
