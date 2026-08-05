import { fromCents, toCents } from "./money";
import {
  Product,
  ProductSupplier,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  ReplenishmentSuggestion,
  Supplier,
} from "./types";
import { BUSINESS_TIME_ZONE, todayISO } from "./salesSummary";

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
  /** YYYY-MM-DD. Backend filters `expected_at >= expectedFrom`. */
  expectedFrom?: string;
  /** YYYY-MM-DD. Backend filters `expected_at < expectedTo` (exclusive). */
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

/** The backend always sends purchase-order item quantities as a fixed
 * 3-decimal string (`StringFixed(3)`, e.g. "8.000") so it can carry
 * fractional quantities for weighable items later — a non-goal of this
 * change. Displaying that raw string reads as "8.000" for an ordinary
 * whole-unit line; this formats it the way a person expects ("8"), while
 * still showing real decimals if a fractional quantity is ever present. */
export function formatQuantity(quantity: string): string {
  const [whole, fraction = ""] = quantity.split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "") || "0";
  const normalizedFraction = fraction.replace(/0+$/, "");
  return normalizedFraction
    ? `${normalizedWhole},${normalizedFraction}`
    : normalizedWhole;
}

export type PurchaseOrderSchedule =
  | "today"
  | "this_week"
  | "overdue"
  | "no_expected_date";

export type PurchaseOrderScheduleRegion = "today" | "week";

function calendarDayInBusinessTimeZone(timestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map((part) => parseInt(part, 10));
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

/**
 * Builds the target-date bounds for one hub region. The backend treats
 * `expected_to` as exclusive, so the end of a calendar-day range is the next
 * day. A selected target day narrows the appropriate region to that day.
 */
export function purchaseOrderScheduleBounds(
  today: string,
  targetDate: string,
  region: PurchaseOrderScheduleRegion,
): { expectedFrom?: string; expectedTo?: string } | null {
  const tomorrow = addCalendarDays(today, 1);
  const weekEnd = addCalendarDays(today, 6);

  if (!targetDate) {
    return region === "today"
      ? { expectedTo: tomorrow }
      : { expectedFrom: tomorrow, expectedTo: addCalendarDays(weekEnd, 1) };
  }

  if (region === "today") {
    return targetDate <= today
      ? { expectedFrom: targetDate, expectedTo: addCalendarDays(targetDate, 1) }
      : null;
  }

  return targetDate >= tomorrow && targetDate <= weekEnd
    ? { expectedFrom: targetDate, expectedTo: addCalendarDays(targetDate, 1) }
    : null;
}

export function classifyPurchaseOrderSchedule(
  order: Pick<PurchaseOrder, "expected_at">,
  now = new Date(),
): PurchaseOrderSchedule {
  if (!order.expected_at) return "no_expected_date";
  const today = todayISO(now);
  const expectedDay = calendarDayInBusinessTimeZone(order.expected_at);
  if (expectedDay < today) return "overdue";
  if (expectedDay === today) return "today";
  return expectedDay <= addCalendarDays(today, 6) ? "this_week" : "no_expected_date";
}

export function quantityUnit(
  product?: Pick<Product, "unit_type"> | null,
): "kg" | "un" {
  return product?.unit_type === "pesable" ? "kg" : "un";
}

export function quantityThousandths(value: string): number {
  const [whole, fraction = ""] = value.split(".");
  return parseInt(whole, 10) * 1000 + parseInt((fraction + "000").slice(0, 3), 10);
}

export function isValidPurchaseQuantity(value: string): boolean {
  return /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(value) &&
    quantityThousandths(value) > 0;
}

function isValidNonNegativeQuantity(value: string): boolean {
  return /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(value);
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
  quantity: string;
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
    const subtotalCents = Math.round(
      (quantityThousandths(item.quantity) * toCents(item.unitCost)) / 1000,
    );
    totalCents += subtotalCents;
    return { ...item, subtotal: fromCents(subtotalCents) };
  });
  return { lines, total: fromCents(totalCents) };
}

/** `<input type="date">` returns YYYY-MM-DD; the backend requires RFC3339. */
export function toOrderedAtPayload(dateInput: string): string {
  return `${dateInput}T00:00:00Z`;
}

/** Reuses `buildPurchaseOrdersQuery` to ask for the single most recent order
 * to a supplier: the backend orders `GET /purchase-orders` by `ordered_at
 * DESC`, so `page=1&limit=1` is "the last order" (design.md, decision D1). */
export function buildLastPurchaseOrderQuery(supplierId: string): string {
  return buildPurchaseOrdersQuery({
    supplierId,
    from: "",
    to: "",
    status: "",
    page: 1,
    limit: 1,
  });
}

/** Why a line from a previous order can't be preloaded into a new draft
 * (design.md, decision D2). Nothing is dropped silently: every exclusion is
 * reported with this reason next to the line's original name. */
export type PurchaseOrderPreloadExclusionReason =
  "removed" | "free_text" | "inactive_product" | "missing_product";

export type PurchaseOrderPreloadLine = {
  productId: string;
  productName: string;
  quantity: string;
  unitCost: string;
};

export type PurchaseOrderPreloadExclusion = {
  productName: string;
  reason: PurchaseOrderPreloadExclusionReason;
};

export type PurchaseOrderPreloadDraft = {
  lines: PurchaseOrderPreloadLine[];
  exclusions: PurchaseOrderPreloadExclusion[];
};

/** Derives the preloadable draft from a previous order to the same supplier.
 * A `CANCELLED` source order is a valid origin: it means nothing arrived and
 * is exactly when re-ordering the same thing is wanted (design.md, D2). This
 * function only looks at `items`; the caller decides what to do with
 * `sourceOrder.status`. */
export function derivePurchaseOrderPreloadDraft(
  sourceOrder: Pick<PurchaseOrder, "items">,
  catalogProducts: Product[],
): PurchaseOrderPreloadDraft {
  const lines: PurchaseOrderPreloadLine[] = [];
  const exclusions: PurchaseOrderPreloadExclusion[] = [];
  for (const item of sourceOrder.items) {
    const productName = item.product_name ?? item.description ?? "Producto";
    if (item.removed_at) {
      exclusions.push({ productName, reason: "removed" });
      continue;
    }
    if (!item.product_id) {
      exclusions.push({ productName, reason: "free_text" });
      continue;
    }
    const catalogProduct = catalogProducts.find(
      (product) => product.id === item.product_id,
    );
    if (!catalogProduct) {
      exclusions.push({ productName, reason: "missing_product" });
      continue;
    }
    if (!catalogProduct.active) {
      exclusions.push({ productName, reason: "inactive_product" });
      continue;
    }
    lines.push({
      productId: item.product_id,
      productName,
      quantity: formatQuantity(item.quantity),
      unitCost: item.unit_cost,
    });
  }
  return { lines, exclusions };
}

const PURCHASE_ORDER_PRELOAD_EXCLUSION_REASON_LABELS: Record<
  PurchaseOrderPreloadExclusionReason,
  string
> = {
  removed: "se había quitado de aquel pedido",
  free_text: "era un ítem de texto libre, sin producto del catálogo",
  inactive_product: "el producto está inactivo en el catálogo",
  missing_product: "el producto ya no está en el catálogo cargado",
};

/** Spanish copy for why a line was excluded from the preload banner
 * (design.md, decision D2 — "nada se descarta en silencio"). */
export function purchaseOrderPreloadExclusionReasonLabel(
  reason: PurchaseOrderPreloadExclusionReason,
): string {
  return PURCHASE_ORDER_PRELOAD_EXCLUSION_REASON_LABELS[reason];
}

/** Resolution decided locally for one active line before `POST /receive`
 * (design.md, decision D4). Mirrors the three mockup actions onto the
 * existing reception contract; nothing is sent until confirm. */
export type ReceptionLineResolution =
  | { action: "received_all" }
  | { action: "received_partial"; receivedQuantity: string; reason: string }
  | { action: "not_delivered"; reason: string };

/** Spanish copy for a line's resolved bar in the detail view (design.md,
 * decision D4). `requestedQuantity` is the item's `quantity`, always coming
 * from the backend — never recomputed here. */
export function describeReceptionLineResolution(
  resolution: ReceptionLineResolution,
  requestedQuantity: string,
): string {
  const requested = formatQuantity(requestedQuantity);
  if (resolution.action === "received_all") {
    // "N/N", matching PurchaseOrderDetail.dc.html's isAllResolved state
    // literally ({{ item.qty }}/{{ item.qty }}), not just "N" (user
    // decision, 2026-08-04: mockup wins on copy).
    return `Recibido completo: ${requested}/${requested}`;
  }
  if (resolution.action === "received_partial") {
    return `Recibido parcial: ${formatQuantity(resolution.receivedQuantity)} de ${requested} · Motivo: ${resolution.reason}`;
  }
  // Copy matches the mockup's "Fuera del pedido" wording for this resolved
  // bar (PurchaseOrderDetail.dc.html, isRemovedResolved state), not the
  // "No entregado" this change had kept from design.md D4's own copy
  // proposal. The user explicitly authorized the mockup's wording over
  // design.md here (2026-08-04); the underlying mapping onto
  // `POST /receive` from D4 is unchanged — this is copy only.
  return `Fuera del pedido · Motivo: ${resolution.reason}`;
}

export type ReceptionResolutionState = Record<string, ReceptionLineResolution>;

export type ReceptionPayloadItem = {
  item_id: string;
  received_quantity: string;
  non_delivery_reason?: string;
};

/** Builds the `POST /purchase-orders/{id}/receive` payload from the local
 * resolution, one entry per active item. `non_delivery_reason` is present
 * exactly when `received_quantity` is less than the requested `quantity`
 * (design.md, decision D4). Throws if an active item has no resolution yet:
 * callers must keep the confirm action disabled until every active item is
 * resolved. */
export function buildReceptionPayload(
  activeItems: PurchaseOrderItem[],
  resolutions: ReceptionResolutionState,
): ReceptionPayloadItem[] {
  return activeItems.map((item) => {
    const resolution = resolutions[item.id];
    if (!resolution) {
      throw new Error(`No hay resolución local para el ítem ${item.id}.`);
    }
    if (resolution.action === "received_all") {
      return { item_id: item.id, received_quantity: item.quantity };
    }
    const receivedQuantity =
      resolution.action === "received_partial"
        ? resolution.receivedQuantity
      : "0";
    return {
      item_id: item.id,
      received_quantity: receivedQuantity,
      non_delivery_reason: resolution.reason,
    };
  });
}

export type ReceptionResolutionSummary = {
  resolvedCount: number;
  totalCount: number;
  outcome: "receive" | "cancel";
};

/** How many of the active lines are resolved, and whether confirming now
 * would receive the order or cancel it — mirrors `ValidateReception` in the
 * backend: the order cancels when no item has a received quantity greater
 * than zero (design.md, decision D4). */
export function summarizeReceptionResolution(
  activeItems: PurchaseOrderItem[],
  resolutions: ReceptionResolutionState,
): ReceptionResolutionSummary {
  const totalCount = activeItems.length;
  const resolvedCount = activeItems.filter(
    (item) => resolutions[item.id] !== undefined,
  ).length;
  const anyReceived = activeItems.some((item) => {
    const resolution = resolutions[item.id];
    if (!resolution) return false;
    if (resolution.action === "received_all") return true;
    if (resolution.action === "received_partial") {
      return quantityThousandths(resolution.receivedQuantity) > 0;
    }
    return false;
  });
  return {
    resolvedCount,
    totalCount,
    outcome: anyReceived ? "receive" : "cancel",
  };
}

/** Pure validation of a received quantity: an integer between zero and the
 * requested quantity (inclusive), matching what `ValidateReception` accepts
 * in the backend. */
export function isValidReceivedQuantity(
  receivedQuantity: string,
  requestedQuantity: string,
): boolean {
  return (
    isValidNonNegativeQuantity(receivedQuantity) &&
    quantityThousandths(receivedQuantity) <= quantityThousandths(requestedQuantity)
  );
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
