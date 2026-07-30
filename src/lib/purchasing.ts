import { PurchaseOrderStatus, Supplier } from "./types";

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
}): string {
  const params = new URLSearchParams();
  if (options.supplierId) params.set("supplier_id", options.supplierId);
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);
  if (options.status) params.set("status", options.status);
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

/** `<input type="date">` returns YYYY-MM-DD; the backend requires RFC3339. */
export function toOrderedAtPayload(dateInput: string): string {
  return `${dateInput}T00:00:00Z`;
}
