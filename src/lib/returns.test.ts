import { describe, expect, it } from "vitest";
import {
  buildReturnPayload,
  computeAvailability,
  computeNetTotal,
  computeSelectionValue,
  hasAnySelection,
  isValidReason,
  sumReturnedByItem,
  sumReturnedTotal,
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

const weighedItem: SaleItem = {
  id: "item-3",
  product_id: "prod-3",
  product_name: "Queso",
  quantity: 1,
  weight: "2.500",
  unit_price: "1000.00",
  subtotal: "2500.00",
};

function makeReturn(
  saleItemId: string,
  quantity: number,
  unitPrice = "1000.00",
): Return {
  return {
    id: `ret-${saleItemId}-${quantity}`,
    sale_id: "sale-1",
    reason: "motivo",
    total_amount: (Number(unitPrice) * quantity).toFixed(2),
    performed_by: "user-1",
    created_at: "2026-07-27T10:00:00Z",
    refund_payments: [{ id: "refund-1", method: "CASH", amount: "1.00" }],
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
        measure: "unit",
        sold: 5,
        alreadyReturned: 0,
        available: 5,
      },
      {
        saleItemId: "item-2",
        productId: "prod-2",
        productName: "Alfajor",
        unitPrice: "500.00",
        measure: "unit",
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

  it("uses kilogram weight for weighable items and their returns", () => {
    const weighedReturn: Return = {
      ...makeReturn("item-3", 1),
      items: [
        {
          id: "retitem-item-3",
          sale_item_id: "item-3",
          product_id: "prod-3",
          weight: "0.750",
          unit_price: "1000.00",
          subtotal: "750.00",
        },
      ],
    };
    const availability = computeAvailability([weighedItem], [weighedReturn]);

    expect(availability[0]).toMatchObject({
      measure: "weight",
      sold: 2.5,
      alreadyReturned: 0.75,
      available: 1.75,
    });
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
    const payload = buildReturnPayload(
      "  producto roto  ",
      [
        { saleItemId: "item-1", quantity: 2 },
        { saleItemId: "item-2", quantity: 0 },
      ],
      [{ method: "CASH", amount: "2000.00" }],
    );
    expect(payload).toEqual({
      reason: "producto roto",
      items: [{ sale_item_id: "item-1", quantity: 2 }],
      refund_payments: [{ method: "CASH", amount: "2000.00" }],
    });
  });

  it("sends a weight instead of quantity for a weighable line", () => {
    const payload = buildReturnPayload(
      " producto en mal estado ",
      [{ saleItemId: "item-3", weight: "0.750" }],
      [{ method: "CASH", amount: "750.00" }],
    );

    expect(payload.items).toEqual([{ sale_item_id: "item-3", weight: "0.750" }]);
  });
});

describe("sumReturnedTotal", () => {
  it("is zero with no returns", () => {
    expect(sumReturnedTotal([])).toBe("0.00");
  });

  it("sums the total_amount across all returns", () => {
    const returns = [
      makeReturn("item-1", 2, "1000.00"),
      makeReturn("item-2", 1, "500.00"),
    ];
    expect(sumReturnedTotal(returns)).toBe("2500.00");
  });
});

describe("computeNetTotal", () => {
  it("equals the sale total when nothing was returned", () => {
    expect(computeNetTotal("6000.00", [])).toBe("6000.00");
  });

  it("subtracts returned merchandise from the sale total", () => {
    const returns = [makeReturn("item-1", 2, "1000.00")];
    expect(computeNetTotal("6000.00", returns)).toBe("4000.00");
  });

  it("never goes negative even if returns exceed the sale total", () => {
    const returns = [makeReturn("item-1", 9, "1000.00")];
    expect(computeNetTotal("6000.00", returns)).toBe("0.00");
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

  it("calculates weighable selections using the kilogram price", () => {
    const value = computeSelectionValue(
      [{ saleItemId: "item-3", weight: "0.750" }],
      computeAvailability([weighedItem], []),
    );

    expect(value).toBe("750.00");
  });
});
