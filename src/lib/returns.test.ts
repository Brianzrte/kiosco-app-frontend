import { describe, expect, it } from "vitest";
import {
  buildReturnPayload,
  computeAvailability,
  computeSelectionValue,
  hasAnySelection,
  isValidReason,
  sumReturnedByItem,
} from "./returns";
import { Return, SaleItem } from "./types";

const items: SaleItem[] = [
  {
    id: "item-1",
    product_id: "prod-1",
    product_name: "Coca-Cola 600ml",
    quantity: 5,
    unit_price: "1000.00",
    subtotal: "5000.00",
  },
  {
    id: "item-2",
    product_id: "prod-2",
    product_name: "Alfajor",
    quantity: 2,
    unit_price: "500.00",
    subtotal: "1000.00",
  },
];

function makeReturn(saleItemId: string, quantity: number, unitPrice = "1000.00"): Return {
  return {
    id: `ret-${saleItemId}-${quantity}`,
    sale_id: "sale-1",
    reason: "motivo",
    total_amount: "0.00",
    performed_by: "user-1",
    created_at: "2026-07-27T10:00:00Z",
    items: [
      {
        id: `retitem-${saleItemId}`,
        sale_item_id: saleItemId,
        product_id: "prod-1",
        quantity,
        unit_price: unitPrice,
        subtotal: (Number(unitPrice) * quantity).toFixed(2),
      },
    ],
  };
}

describe("sumReturnedByItem", () => {
  it("is empty when there are no returns", () => {
    expect(sumReturnedByItem([]).size).toBe(0);
  });

  it("sums quantities per sale_item_id across multiple returns", () => {
    const returns = [makeReturn("item-1", 2), makeReturn("item-1", 1)];
    const sums = sumReturnedByItem(returns);
    expect(sums.get("item-1")).toBe(3);
  });
});

describe("computeAvailability", () => {
  it("available equals sold when nothing was returned yet", () => {
    const availability = computeAvailability(items, []);
    expect(availability).toEqual([
      {
        saleItemId: "item-1",
        productId: "prod-1",
        productName: "Coca-Cola 600ml",
        unitPrice: "1000.00",
        sold: 5,
        alreadyReturned: 0,
        available: 5,
      },
      {
        saleItemId: "item-2",
        productId: "prod-2",
        productName: "Alfajor",
        unitPrice: "500.00",
        sold: 2,
        alreadyReturned: 0,
        available: 2,
      },
    ]);
  });

  it("subtracts already-returned quantity from availability", () => {
    const availability = computeAvailability(items, [makeReturn("item-1", 2)]);
    const item1 = availability.find((a) => a.saleItemId === "item-1")!;
    expect(item1.alreadyReturned).toBe(2);
    expect(item1.available).toBe(3);
  });

  it("never goes negative even if returns exceed what was sold", () => {
    const availability = computeAvailability(items, [makeReturn("item-1", 9)]);
    const item1 = availability.find((a) => a.saleItemId === "item-1")!;
    expect(item1.available).toBe(0);
  });

  it("fully returned items stay listed with zero available", () => {
    const availability = computeAvailability(items, [makeReturn("item-2", 2)]);
    const item2 = availability.find((a) => a.saleItemId === "item-2")!;
    expect(item2.available).toBe(0);
    expect(item2.alreadyReturned).toBe(2);
  });
});

describe("isValidReason", () => {
  it("rejects empty and whitespace-only reasons", () => {
    expect(isValidReason("")).toBe(false);
    expect(isValidReason("   ")).toBe(false);
  });

  it("accepts a trimmed non-empty reason", () => {
    expect(isValidReason("  producto vencido  ")).toBe(true);
  });
});

describe("hasAnySelection", () => {
  it("is false when every line is zero", () => {
    expect(
      hasAnySelection([
        { saleItemId: "item-1", quantity: 0 },
        { saleItemId: "item-2", quantity: 0 },
      ]),
    ).toBe(false);
  });

  it("is true when at least one line has quantity", () => {
    expect(
      hasAnySelection([
        { saleItemId: "item-1", quantity: 0 },
        { saleItemId: "item-2", quantity: 1 },
      ]),
    ).toBe(true);
  });
});

describe("buildReturnPayload", () => {
  it("trims the reason and drops zero-quantity lines", () => {
    const payload = buildReturnPayload("  producto roto  ", [
      { saleItemId: "item-1", quantity: 2 },
      { saleItemId: "item-2", quantity: 0 },
    ]);
    expect(payload).toEqual({
      reason: "producto roto",
      items: [{ sale_item_id: "item-1", quantity: 2 }],
    });
  });
});

describe("computeSelectionValue", () => {
  it("sums selected lines in cents, formatted as a decimal string", () => {
    const availability = computeAvailability(items, []);
    const value = computeSelectionValue(
      [
        { saleItemId: "item-1", quantity: 2 },
        { saleItemId: "item-2", quantity: 1 },
      ],
      availability,
    );
    expect(value).toBe("2500.00");
  });

  it("ignores zero-quantity and unknown lines", () => {
    const availability = computeAvailability(items, []);
    const value = computeSelectionValue(
      [
        { saleItemId: "item-1", quantity: 0 },
        { saleItemId: "unknown", quantity: 3 },
      ],
      availability,
    );
    expect(value).toBe("0.00");
  });
});
