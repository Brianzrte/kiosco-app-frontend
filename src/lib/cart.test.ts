import { describe, expect, it } from "vitest";
import {
  addEmptyWeightLine,
  addOrIncrementUnitLine,
  applyStockCap,
  cartTotalCents,
  stockLimitMessage,
  summarizeCart,
  updateLineWeight,
  WEIGHT_ERROR_MESSAGE,
  type CartLine,
} from "./cart";
import type { Product } from "./types";

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

describe("addOrIncrementUnitLine", () => {
  it("adds a new line with quantity 1", () => {
    const product = makeProduct();
    const cart = addOrIncrementUnitLine([], product);
    expect(cart).toEqual([{ product, quantity: 1 }]);
  });

  it("increments an existing line instead of duplicating it", () => {
    const product = makeProduct();
    const cart = addOrIncrementUnitLine(
      [{ product, quantity: 1 }],
      product,
    );
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });
});

describe("applyStockCap", () => {
  it("caps the quantity and returns a message when over available stock", () => {
    const product = makeProduct({ name: "Fideos" });
    const cart: CartLine[] = [{ product, quantity: 5 }];
    const result = applyStockCap(cart, product.id, 3);
    expect(result.cart[0].quantity).toBe(3);
    expect(result.message).toBe(stockLimitMessage("Fideos", 3));
  });

  it("applies the cap against the cart at the time stock resolves, not an earlier snapshot", () => {
    const product = makeProduct();
    // cart changed (quantity went from 1 to 5) between the stock request
    // being sent and its response arriving — the cap must read the live
    // cart passed in, not a value captured before the await.
    const cartAfterMoreScans: CartLine[] = [{ product, quantity: 5 }];
    const result = applyStockCap(cartAfterMoreScans, product.id, 2);
    expect(result.cart[0].quantity).toBe(2);
  });

  it("returns the cart unchanged with no message when within stock", () => {
    const product = makeProduct();
    const cart: CartLine[] = [{ product, quantity: 2 }];
    const result = applyStockCap(cart, product.id, 5);
    expect(result.cart).toEqual(cart);
    expect(result.message).toBeNull();
  });

  it("names zero available stock explicitly", () => {
    expect(stockLimitMessage("Fideos", 0)).toBe(
      "“Fideos” no tiene stock disponible.",
    );
  });
});

describe("updateLineWeight", () => {
  const product = makeProduct({
    id: "p2",
    unit_type: "pesable",
    price_per_kg: "20.00",
  });

  it("calculates the price for a valid weight", () => {
    const cart = updateLineWeight(
      [{ product, quantity: 0 }],
      product.id,
      "1.5",
      "20.00",
    );
    expect(cart[0].calculatedPrice).toBe("30.00");
    expect(cart[0].weightError).toBeNull();
  });

  it("never leaves a stale subtotal when the weight becomes invalid", () => {
    const withValidWeight: CartLine[] = [
      { product, quantity: 0, weight: "1.5", calculatedPrice: "30.00" },
    ];
    const cart = updateLineWeight(withValidWeight, product.id, "abc", "20.00");
    expect(cart[0].calculatedPrice).toBeUndefined();
    expect(cart[0].weightError).toBe(WEIGHT_ERROR_MESSAGE);
  });

  it("recalculates from the new valid weight only, never the earlier one", () => {
    let cart: CartLine[] = [{ product, quantity: 0 }];
    cart = updateLineWeight(cart, product.id, "1.5", "20.00");
    expect(cart[0].calculatedPrice).toBe("30.00");
    cart = updateLineWeight(cart, product.id, "abc", "20.00");
    expect(cart[0].calculatedPrice).toBeUndefined();
    cart = updateLineWeight(cart, product.id, "2", "20.00");
    expect(cart[0].calculatedPrice).toBe("40.00");
  });

  it("clears a manually edited real price when the weight changes", () => {
    const cart = updateLineWeight(
      [{ product, quantity: 0, weight: "1", calculatedPrice: "20.00", actualPrice: "18.00" }],
      product.id,
      "2",
      "20.00",
    );
    expect(cart[0].actualPrice).toBeUndefined();
  });
});

describe("addEmptyWeightLine", () => {
  it("adds a pesable line with empty weight and zero quantity", () => {
    const product = makeProduct({ unit_type: "pesable", price_per_kg: "20.00" });
    const cart = addEmptyWeightLine([], product);
    expect(cart).toEqual([{ product, quantity: 0 }]);
  });

  it("is a no-op when a line for the product already exists", () => {
    const product = makeProduct({ unit_type: "pesable", price_per_kg: "20.00" });
    const existing: CartLine[] = [
      { product, quantity: 0, weight: "1.2", calculatedPrice: "24.00" },
    ];
    const cart = addEmptyWeightLine(existing, product);
    expect(cart).toEqual(existing);
  });
});

describe("cartTotalCents", () => {
  it("sums unitario lines from unit price × quantity, decimal-safe", () => {
    const a = makeProduct({ id: "a", price: "12.50" });
    const b = makeProduct({ id: "b", price: "0.10" });
    const cents = cartTotalCents([
      { product: a, quantity: 3 },
      { product: b, quantity: 3 },
    ]);
    expect(cents).toBe(3780);
  });

  it("uses the actual price over the calculated price when present", () => {
    const product = makeProduct({ unit_type: "pesable", price_per_kg: "20.00" });
    const cents = cartTotalCents([
      { product, quantity: 0, weight: "1", calculatedPrice: "20.00", actualPrice: "18.00" },
    ]);
    expect(cents).toBe(1800);
  });

  it("excludes a pesable line with no valid subtotal from the total", () => {
    const product = makeProduct({ unit_type: "pesable", price_per_kg: "20.00" });
    const cents = cartTotalCents([
      { product, quantity: 0, weight: "abc", calculatedPrice: undefined },
    ]);
    expect(cents).toBe(0);
  });
});

describe("summarizeCart", () => {
  it("counts lines and units for unitario lines", () => {
    const a = makeProduct({ id: "a" });
    const summary = summarizeCart([{ product: a, quantity: 3 }]);
    expect(summary.lineCount).toBe(1);
    expect(summary.unitCount).toBe(3);
    expect(summary.hasUnitLines).toBe(true);
    expect(summary.hasWeighableLines).toBe(false);
  });

  it("sums weight in kilograms separately, without adding it to unit count", () => {
    const unit = makeProduct({ id: "a" });
    const weighable = makeProduct({
      id: "b",
      unit_type: "pesable",
      price_per_kg: "20.00",
    });
    const summary = summarizeCart([
      { product: unit, quantity: 2 },
      { product: weighable, quantity: 0, weight: "1.250" },
      { product: weighable, quantity: 0, weight: "0.500" },
    ]);
    expect(summary.unitCount).toBe(2);
    expect(summary.weightKg).toBeCloseTo(1.75, 3);
    expect(summary.hasWeighableLines).toBe(true);
  });

  it("ignores an invalid or empty weight when summing kilograms", () => {
    const weighable = makeProduct({
      id: "b",
      unit_type: "pesable",
      price_per_kg: "20.00",
    });
    const summary = summarizeCart([
      { product: weighable, quantity: 0, weight: "abc" },
      { product: weighable, quantity: 0 },
    ]);
    expect(summary.weightKg).toBe(0);
  });
});
