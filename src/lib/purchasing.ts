import { fromCents, toCents } from "./money";
import {
  ProductSupplier,
  PurchaseOrderStatus,
  ReplenishmentSuggestion,
  Supplier,
} from "./types";

export const PURCHASE_ORDER_PAGE_SIZE = 20;

const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  PENDING: "Pendiente",
  RECEIVED: "Recibido",
  CANCELLED: "Cancelado",
};

const PURCHASE_PAYMENT_METHOD_LABELS = {
  cash: "Efectivo",
  transfer: "Transferencia",
  account: "Cuenta corriente",
} as const;

export function buildPurchaseOrdersQuery(options: {
  supplierId: string;
  from: string;
  to: string;
  status: PurchaseOrderStatus | "";
  page: number;
  limit?: number;
  /** RFC3339. Backend filters `expected_at >= expectedFrom`. */
  expectedFrom?: string;
  /** RFC3339. Backend filters `expected_at < expectedTo` (exclusive). */
  expectedTo?: string;
  /** Backend only accepts `expected_at` as a sort key (`order_by`); omit for the default `ordered_at DESC`. */
  orderByExpected?: boolean;
}): string {
  const params = new URLSearchParams();
  if (options.supplierId) params.set("supplier_id", options.supplierId);
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);
  if (options.status) params.set("status", options.status);
  if (options.expectedFrom) params.set("expected_from", options.expectedFrom);
  if (options.expectedTo) params.set("expected_to", options.expectedTo);
  if (options.orderByExpected) params.set("order_by", "expected_at");
  params.set("page", String(options.page));
  params.set("limit", String(options.limit ?? PURCHASE_ORDER_PAGE_SIZE));
  return params.toString();
}

export function buildPurchasesBySupplierQuery(options: {
  from: string;
  to: string;
  supplierId: string;
}): string {
  const params = new URLSearchParams({ from: options.from, to: options.to });
  if (options.supplierId) params.set("supplier_id", options.supplierId);
  return params.toString();
}

export function purchaseOrderStatusLabel(status: PurchaseOrderStatus): string {
  return PURCHASE_ORDER_STATUS_LABELS[status];
}

export function purchasePaymentMethodLabel(
  method: keyof typeof PURCHASE_PAYMENT_METHOD_LABELS,
): string {
  return PURCHASE_PAYMENT_METHOD_LABELS[method];
}

export function supplierLabel(supplier: Supplier): string {
  return supplier.active ? supplier.name : `${supplier.name} (inactivo)`;
}

export function splitReplenishmentSuggestions(
  suggestions: ReplenishmentSuggestion[],
): {
  lowStock: ReplenishmentSuggestion[];
  incompleteData: ReplenishmentSuggestion[];
} {
  const lowStock = suggestions.filter(
    (suggestion) =>
      typeof suggestion.suggested_quantity === "number" &&
      suggestion.suggested_quantity > 0,
  );
  const incompleteData = suggestions.filter(
    (suggestion) =>
      suggestion.suggested_quantity === undefined ||
      suggestion.suggested_quantity === null,
  );
  return { lowStock, incompleteData };
}

export function filterIncompleteDataSuggestions(
  suggestions: ReplenishmentSuggestion[],
  term: string,
): ReplenishmentSuggestion[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return suggestions;
  return suggestions.filter((suggestion) =>
    suggestion.product_name.toLowerCase().includes(normalized),
  );
}

export function hasSupplierAssociation(
  associations: ProductSupplier[],
  supplierId: string,
): boolean {
  return associations.some(
    (association) => association.supplier_id === supplierId,
  );
}

export type PurchaseOrderDraftItemSummary = {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: string;
};

export type PurchaseOrderSummaryLine = PurchaseOrderDraftItemSummary & {
  subtotal: string;
};

export function summarizePurchaseOrderDraft(
  items: PurchaseOrderDraftItemSummary[],
): { lines: PurchaseOrderSummaryLine[]; total: string } {
  let totalCents = 0;
  const lines = items.map((item) => {
    const subtotalCents = item.quantity * toCents(item.unitCost);
    totalCents += subtotalCents;
    return { ...item, subtotal: fromCents(subtotalCents) };
  });
  return { lines, total: fromCents(totalCents) };
}

/** `<input type="date">` returns YYYY-MM-DD; the backend requires RFC3339. */
export function toOrderedAtPayload(dateInput: string): string {
  return `${dateInput}T00:00:00Z`;
}

export function appendSupplierAssociation(
  associations: ProductSupplier[],
  supplierId: string,
): {
  suppliers: Array<{
    supplier_id: string;
    preferred: boolean;
    replenishment_frequency_days?: number;
  }>;
} {
  return {
    suppliers: [
      ...associations.map((association) => ({
        supplier_id: association.supplier_id,
        preferred: association.preferred,
        ...(association.replenishment_frequency_days !== undefined
          ? {
              replenishment_frequency_days:
                association.replenishment_frequency_days,
            }
          : {}),
      })),
      { supplier_id: supplierId, preferred: false },
    ],
  };
}
