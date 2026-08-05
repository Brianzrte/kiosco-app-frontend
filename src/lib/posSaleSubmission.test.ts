import { describe, expect, it, vi } from "vitest";
import {
  cartLineToSaleItemPayload,
  submitSale,
  type SubmitSaleDeps,
} from "./posSaleSubmission";
import type { CartLine } from "./cart";
import type { Product, Sale } from "./types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    sku: "SKU-1",
    barcode: "123",
    name: "Producto",
    category_id: "cat-1",
    unit_type: "unitario",
    price: "10.00",
    cost: "5.00",
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: "sale-1",
    cashier_id: "cashier-1",
    status: "confirmed",
    sale_number: 1,
    payments: [],
    total: "10.00",
    items: [],
    created_at: "2024-01-01T00:00:00Z",
    confirmed_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeDeps(overrides: Partial<SubmitSaleDeps> = {}): SubmitSaleDeps {
  return {
    createSale: vi.fn().mockResolvedValue({ id: "sale-1" }),
    addSaleItem: vi.fn().mockResolvedValue(undefined),
    setSalePayment: vi.fn().mockResolvedValue(undefined),
    confirmSale: vi.fn().mockResolvedValue(makeSale()),
    ...overrides,
  };
}

describe("cartLineToSaleItemPayload", () => {
  it("sends quantity for a unitario line", () => {
    const line: CartLine = { product: makeProduct(), quantity: 3 };
    expect(cartLineToSaleItemPayload(line)).toEqual({
      product_id: "p1",
      quantity: 3,
    });
  });

  it("sends weight and an optional actual_price for a pesable line", () => {
    const product = makeProduct({ unit_type: "pesable", price_per_kg: "20.00" });
    const line: CartLine = {
      product,
      quantity: 0,
      weight: "1.5",
      calculatedPrice: "30.00",
      actualPrice: "28.00",
    };
    expect(cartLineToSaleItemPayload(line)).toEqual({
      product_id: "p1",
      weight: "1.5",
      actual_price: "28.00",
    });
  });

  it("omits actual_price for a pesable line without an override", () => {
    const product = makeProduct({ unit_type: "pesable", price_per_kg: "20.00" });
    const line: CartLine = { product, quantity: 0, weight: "1.5" };
    expect(cartLineToSaleItemPayload(line)).toEqual({
      product_id: "p1",
      weight: "1.5",
    });
  });
});

describe("submitSale", () => {
  const cart: CartLine[] = [{ product: makeProduct(), quantity: 2 }];
  const paymentPayload = [{ method: "CASH" as const, amount: "20.00" }];

  it("creates the sale, sends items, payment and confirms in order", async () => {
    const deps = makeDeps();
    const sale = await submitSale({ cart, paymentPayload }, deps);
    expect(deps.createSale).toHaveBeenCalledTimes(1);
    expect(deps.addSaleItem).toHaveBeenCalledWith("sale-1", {
      product_id: "p1",
      quantity: 2,
    });
    expect(deps.setSalePayment).toHaveBeenCalledWith("sale-1", paymentPayload);
    expect(deps.confirmSale).toHaveBeenCalledWith("sale-1");
    expect(sale.id).toBe("sale-1");
  });

  it("calls onSaleCreated as soon as the sale id is available", async () => {
    const onSaleCreated = vi.fn();
    const deps = makeDeps();
    await submitSale({ cart, paymentPayload, onSaleCreated }, deps);
    expect(onSaleCreated).toHaveBeenCalledWith("sale-1");
  });

  it("a retry with an already-retained sale id never calls createSale again", async () => {
    const deps = makeDeps();
    await submitSale(
      { cart, paymentPayload, existingSaleId: "sale-1" },
      deps,
    );
    expect(deps.createSale).not.toHaveBeenCalled();
    expect(deps.addSaleItem).toHaveBeenCalledWith("sale-1", {
      product_id: "p1",
      quantity: 2,
    });
  });

  it("a retry after a failure before the sale was ever created starts one, exactly like a first attempt", async () => {
    const deps = makeDeps({
      addSaleItem: vi
        .fn()
        .mockRejectedValueOnce(new Error("network"))
        .mockResolvedValue(undefined),
    });

    await expect(
      submitSale({ cart, paymentPayload, existingSaleId: null }, deps),
    ).rejects.toThrow("network");
    expect(deps.createSale).toHaveBeenCalledTimes(1);

    // Retry, still with no retained id (the failure happened before any id
    // was ever produced in this scenario's first call).
    const retryDeps = makeDeps();
    await submitSale({ cart, paymentPayload, existingSaleId: null }, retryDeps);
    expect(retryDeps.createSale).toHaveBeenCalledTimes(1);
  });

  it("a retry after a failed payment step reuses the sale id and does not recreate items twice by itself", async () => {
    const deps = makeDeps({
      setSalePayment: vi.fn().mockRejectedValue(new Error("network")),
    });
    await expect(
      submitSale({ cart, paymentPayload }, deps),
    ).rejects.toThrow("network");
    expect(deps.createSale).toHaveBeenCalledTimes(1);

    const retryDeps = makeDeps();
    await submitSale(
      { cart, paymentPayload, existingSaleId: "sale-1" },
      retryDeps,
    );
    expect(retryDeps.createSale).not.toHaveBeenCalled();
    expect(retryDeps.confirmSale).toHaveBeenCalledWith("sale-1");
  });
});
