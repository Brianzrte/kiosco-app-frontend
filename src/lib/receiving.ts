import { PurchaseOrderListItem, PurchaseOrderStatus } from "./types";

export type ReceivingItemMode = "catalog" | "text";

export type AddPurchaseOrderItemInput = {
  mode: ReceivingItemMode;
  productId: string;
  description: string;
  quantity: string;
  unitCost: string;
};

export function statusLabel(status: PurchaseOrderStatus) {
  return status === "PENDING" ? "Pendiente" : status === "RECEIVED" ? "Recibido" : "Cancelado";
}

export function orderForReceiving(orders: PurchaseOrderListItem[]) {
  return [...orders].sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING"));
}

export function hasUncataloguedItems(order: PurchaseOrderListItem) {
  return order.has_uncatalogued_items;
}

export function productSearchPath(search: string) {
  return `/products?search=${encodeURIComponent(search)}`;
}

export function buildAddedItemPayload(input: AddPurchaseOrderItemInput) {
  if (!input.quantity || !input.unitCost) return null;
  if (input.mode === "catalog") {
    return input.productId
      ? { product_id: input.productId, quantity: Number(input.quantity), unit_cost: input.unitCost }
      : null;
  }
  return input.description.trim()
    ? { description: input.description.trim(), quantity: Number(input.quantity), unit_cost: input.unitCost }
    : null;
}
