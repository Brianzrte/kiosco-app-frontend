"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProductCombobox } from "@/components/purchasing/ProductCombobox";
import { formatMoney, fromCents, toCents } from "@/lib/money";
import {
  isValidPurchaseQuantity,
  quantityThousandths,
  quantityUnit,
} from "@/lib/purchasing";
import { Product } from "@/lib/types";

export type ExpenseDraftLine = {
  id: string;
  productId: string;
  quantity: string;
  unitCost: string;
};

/**
 * Una línea de producto, compartida entre `Compra` (costo editable, D9) y
 * `Autoconsumo` (costo de sólo lectura desde el catálogo, D5). Reutiliza
 * `ProductCombobox` y las reglas de cantidad decimal de `purchasing.ts` — el
 * mismo patrón que ya usa el pedido de compra, en vez de reinventarlo.
 */
export function ExpenseLineRow({
  line,
  products,
  editableCost,
  disabledRemove,
  error,
  onUpdate,
  onRemove,
  removeButtonRef,
  quantityInputRef,
}: {
  line: ExpenseDraftLine;
  products: Product[];
  editableCost: boolean;
  disabledRemove: boolean;
  error?: string;
  onUpdate: (
    field: "productId" | "quantity" | "unitCost",
    value: string,
  ) => void;
  onRemove: () => void;
  removeButtonRef?: (el: HTMLButtonElement | null) => void;
  quantityInputRef?: (el: HTMLInputElement | null) => void;
}) {
  const product = products.find((p) => p.id === line.productId);
  const unit = quantityUnit(product);
  const resolvedUnitCost = editableCost ? line.unitCost : (product?.cost ?? "");
  const hasValidLine =
    resolvedUnitCost.trim() && isValidPurchaseQuantity(line.quantity);
  const subtotal = hasValidLine
    ? formatMoney(
        fromCents(
          Math.round(
            (quantityThousandths(line.quantity) * toCents(resolvedUnitCost)) /
              1000,
          ),
        ),
      )
    : null;
  const errorId = error ? `line-${line.id}-error` : undefined;

  return (
    <div className="flex flex-col gap-3 rounded-app border border-border bg-surface p-3">
      <ProductCombobox
        productId={line.productId}
        products={products}
        onSelect={(productId) => onUpdate("productId", productId)}
      />
      <div className="flex flex-wrap items-end gap-3">
        <Input
          ref={quantityInputRef}
          label={`Cantidad en ${unit === "kg" ? "kilogramos" : "unidades"}`}
          inputMode="decimal"
          value={line.quantity}
          onChange={(event) => onUpdate("quantity", event.target.value)}
          endAdornment={
            <span aria-hidden className="text-xs text-text-secondary">
              {unit}
            </span>
          }
          className="w-36"
          aria-describedby={errorId}
        />
        {editableCost ? (
          <Input
            label="Costo unitario"
            inputMode="decimal"
            value={line.unitCost}
            onChange={(event) => onUpdate("unitCost", event.target.value)}
            className="w-32"
          />
        ) : (
          <div className="w-32">
            <p className="mb-1.5 text-sm font-medium text-text-secondary">
              Costo unitario
            </p>
            <p className="num rounded-app border border-border bg-surface-subtle px-3 py-2.5 text-sm text-text-secondary">
              {product ? formatMoney(product.cost) : "—"}
            </p>
          </div>
        )}
        <div className="flex-1 min-w-[6rem]">
          <p className="mb-1.5 text-sm font-medium text-text-secondary">
            Subtotal
          </p>
          <p className="num text-sm font-semibold text-text-primary">
            {subtotal ?? "—"}
          </p>
        </div>
        <Button
          ref={removeButtonRef}
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabledRemove}
          className="text-error hover:bg-error/12"
          onClick={onRemove}
        >
          Quitar
        </Button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
