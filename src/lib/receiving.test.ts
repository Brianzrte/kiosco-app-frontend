import { describe, expect, it } from "vitest";
import { buildAddedItemPayload, hasUncataloguedItems, orderForReceiving, productSearchPath, statusLabel } from "./receiving";

const order = (id: string, status: "PENDING" | "RECEIVED", pending = false) => ({ id, supplier_name: "Proveedor", ordered_at: "2026-01-01T00:00:00Z", total: "1.00", status, has_uncatalogued_items: pending });
describe("receiving helpers", () => {
  it("places pending orders first", () => expect(orderForReceiving([order("r", "RECEIVED"), order("p", "PENDING")]).map((item) => item.id)).toEqual(["p", "r"]));
  it("labels statuses and detects uncatalogued items", () => { expect(statusLabel("RECEIVED")).toBe("Recibido"); expect(hasUncataloguedItems(order("p", "PENDING", true))).toBe(true); });
});

describe("unplanned item helpers", () => {
  it("builds exactly one product identity", () => {
    expect(buildAddedItemPayload({ mode: "catalog", productId: "p-1", description: "ignored", quantity: "2", unitCost: "1.50" })).toEqual({ product_id: "p-1", quantity: 2, unit_cost: "1.50" });
    expect(buildAddedItemPayload({ mode: "text", productId: "p-1", description: "Bolsa", quantity: "2", unitCost: "1.50" })).toEqual({ description: "Bolsa", quantity: 2, unit_cost: "1.50" });
    expect(productSearchPath("coca cola")).toBe("/products?search=coca%20cola");
  });
});
