"use client";

import { Button } from "@/components/ui/Button";
import { IconTrash } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { ProductCombobox } from "@/components/purchasing/ProductCombobox";
import { SupplierAssociationCheck } from "@/components/purchasing/SupplierAssociationCheck";
import { formatMoney, fromCents, toCents } from "@/lib/money";
import { isValidPurchaseQuantity, quantityThousandths, quantityUnit } from "@/lib/purchasing";
import { Product } from "@/lib/types";

export type DraftItem = {
  id: string;
  productId: string;
  quantity: string;
  unitCost: string;
};

// Real `<table>` row, not a card grid: NewPurchaseOrder.dc.html (mockup)
// renders the item list as a dense table with a single header row and
// compact ~40px inputs, not a card per line with repeated field labels. The
// mockup wins over any looser card treatment (user decision, 2026-08-04).
const cellInputClass =
  "w-full rounded-tight border border-border bg-surface px-2.5 py-2 text-xs text-text-primary placeholder:text-text-disabled hover:border-border-hover focus:border-primary";

export function PurchaseOrderItemRow({
  item,
  products,
  supplierId,
  disabledRemove,
  onUpdate,
  onRemove,
  removeButtonRef,
  toast,
}: {
  item: DraftItem;
  products: Product[];
  supplierId: string;
  disabledRemove: boolean;
  onUpdate: (
    field: "productId" | "quantity" | "unitCost",
    value: string,
  ) => void;
  onRemove: () => void;
  /** Lets the parent move focus to this row's remove button after removing
   * another row (design.md, keyboard and focus behavior). */
  removeButtonRef?: (el: HTMLButtonElement | null) => void;
  toast: ReturnType<typeof useToast>;
}) {
  const hasValidLine =
    item.unitCost.trim() && isValidPurchaseQuantity(item.quantity);
  const subtotal = hasValidLine
    ? formatMoney(fromCents(Math.round((quantityThousandths(item.quantity) * toCents(item.unitCost)) / 1000)))
    : null;
  const unit = quantityUnit(products.find((product) => product.id === item.productId));

  return (
    <>
      <tr>
        <td className="min-w-[200px] p-2 align-top">
          <ProductCombobox
            hideLabel
            productId={item.productId}
            products={products}
            onSelect={(productId) => onUpdate("productId", productId)}
          />
        </td>
        <td className="w-[92px] p-2 align-top">
          <div className="relative">
          <input
            aria-label={`Cantidad en ${unit === "kg" ? "kilogramos" : "unidades"}`}
            type="text"
            inputMode="decimal"
            value={item.quantity}
            onChange={(event) => onUpdate("quantity", event.target.value)}
            className={`${cellInputClass} w-full pr-8 num`}
          />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-text-secondary">{unit}</span>
          </div>
        </td>
        <td className="w-[110px] p-2 align-top">
          <input
            aria-label="Costo unitario"
            inputMode="decimal"
            placeholder="0.00"
            value={item.unitCost}
            onChange={(event) => onUpdate("unitCost", event.target.value)}
            className={`${cellInputClass} w-[90px] num`}
          />
        </td>
        <td className="w-[100px] p-2 text-right align-top">
          <span className="num text-sm font-medium text-text-primary">
            {subtotal ?? "—"}
          </span>
        </td>
        <td className="w-11 p-2 text-center align-top">
          <Button
            ref={removeButtonRef}
            type="button"
            variant="ghost"
            iconOnly
            size="sm"
            aria-label="Quitar línea"
            title="Quitar línea"
            disabled={disabledRemove}
            className="text-error hover:bg-error/12"
            onClick={onRemove}
          >
            <IconTrash className="size-4" />
          </Button>
        </td>
      </tr>
      {supplierId && item.productId && (
        <tr>
          {/* One `<td colSpan>` under the row instead of a `md:col-span-5`
              div, so the association banner stays inside the real table
              (user decision, 2026-08-04): the mockup doesn't model this
              banner, but the table itself must stay a genuine `<table>`. */}
          <td colSpan={5} className="bg-surface-subtle p-3">
            {/* Remounted on productId/supplierId change so each product
                change starts a fresh check and discards any in-flight or
                stale result from a previously selected product (design.md
                decision 5). */}
            <SupplierAssociationCheck
              key={`${item.productId}:${supplierId}`}
              productId={item.productId}
              supplierId={supplierId}
              toast={toast}
            />
          </td>
        </tr>
      )}
    </>
  );
}
