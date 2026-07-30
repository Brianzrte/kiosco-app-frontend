import { describe, expect, it } from "vitest";
import {
  appendSupplierAssociation,
  buildPurchaseOrdersQuery,
  buildPurchasesBySupplierQuery,
  filterIncompleteDataSuggestions,
  hasSupplierAssociation,
  purchaseOrderStatusLabel,
  purchasePaymentMethodLabel,
  splitReplenishmentSuggestions,
  summarizePurchaseOrderDraft,
  supplierLabel,
  toOrderedAtPayload,
} from "./purchasing";
import { ProductSupplier, ReplenishmentSuggestion } from "./types";

describe("buildPurchaseOrdersQuery", () => {
  it("omits empty filters while preserving pagination", () => {
    expect(
      buildPurchaseOrdersQuery({
        supplierId: "",
        from: "",
        to: "",
        status: "",
        page: 1,
      }),
    ).toBe("page=1&limit=20");
  });

  it("passes filters through without deriving purchasing data", () => {
    const params = new URLSearchParams(
      buildPurchaseOrdersQuery({
        supplierId: "supplier-1",
        from: "2026-07-01",
        to: "2026-07-31",
        status: "PENDING",
        page: 2,
        limit: 50,
      }),
    );

    expect(params.get("supplier_id")).toBe("supplier-1");
    expect(params.get("from")).toBe("2026-07-01");
    expect(params.get("to")).toBe("2026-07-31");
    expect(params.get("status")).toBe("PENDING");
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("50");
  });
});

describe("buildPurchasesBySupplierQuery", () => {
  it("requires the supplied range and omits an empty supplier filter", () => {
    expect(
      buildPurchasesBySupplierQuery({
        from: "2026-07-01",
        to: "2026-07-31",
        supplierId: "",
      }),
    ).toBe("from=2026-07-01&to=2026-07-31");
  });

  it("includes the optional supplier without regrouping purchase orders", () => {
    const params = new URLSearchParams(
      buildPurchasesBySupplierQuery({
        from: "2026-07-01",
        to: "2026-07-31",
        supplierId: "supplier-1",
      }),
    );
    expect(params.get("supplier_id")).toBe("supplier-1");
  });
});

describe("purchasing display labels", () => {
  it("uses Spanish labels without changing backend values", () => {
    expect(purchaseOrderStatusLabel("PENDING")).toBe("Pendiente");
    expect(purchasePaymentMethodLabel("account")).toBe("Cuenta corriente");
    expect(
      supplierLabel({ id: "supplier-1", name: "Mayorista", active: true }),
    ).toBe("Mayorista");
    expect(
      supplierLabel({ id: "supplier-1", name: "Mayorista", active: false }),
    ).toBe("Mayorista (inactivo)");
  });
});

function suggestion(
  overrides: Partial<ReplenishmentSuggestion> = {},
): ReplenishmentSuggestion {
  return {
    product_id: "product-1",
    product_name: "Producto",
    explanation: "explicación",
    ...overrides,
  };
}

describe("splitReplenishmentSuggestions", () => {
  it("splits a mix of low-stock and incomplete-data suggestions", () => {
    const lowStockItem = suggestion({
      product_id: "product-1",
      suggested_quantity: 5,
    });
    const incompleteItem = suggestion({ product_id: "product-2" });
    const result = splitReplenishmentSuggestions([
      lowStockItem,
      incompleteItem,
    ]);
    expect(result.lowStock).toEqual([lowStockItem]);
    expect(result.incompleteData).toEqual([incompleteItem]);
  });

  it("keeps all items under low-stock when every quantity is positive", () => {
    const items = [
      suggestion({ product_id: "product-1", suggested_quantity: 3 }),
      suggestion({ product_id: "product-2", suggested_quantity: 1 }),
    ];
    const result = splitReplenishmentSuggestions(items);
    expect(result.lowStock).toEqual(items);
    expect(result.incompleteData).toEqual([]);
  });

  it("keeps all items under incomplete data when every quantity is null", () => {
    const items = [
      suggestion({ product_id: "product-1" }),
      suggestion({ product_id: "product-2" }),
    ];
    const result = splitReplenishmentSuggestions(items);
    expect(result.lowStock).toEqual([]);
    expect(result.incompleteData).toEqual(items);
  });

  it("returns two empty arrays for an empty input", () => {
    const result = splitReplenishmentSuggestions([]);
    expect(result.lowStock).toEqual([]);
    expect(result.incompleteData).toEqual([]);
  });
});

function association(
  overrides: Partial<ProductSupplier> = {},
): ProductSupplier {
  return {
    product_id: "product-1",
    supplier_id: "supplier-1",
    preferred: false,
    ...overrides,
  };
}

describe("filterIncompleteDataSuggestions", () => {
  const items = [
    suggestion({ product_id: "product-1", product_name: "Yerba Mate" }),
    suggestion({ product_id: "product-2", product_name: "Azúcar Rubia" }),
  ];

  it("returns every item for an empty term", () => {
    expect(filterIncompleteDataSuggestions(items, "")).toEqual(items);
    expect(filterIncompleteDataSuggestions(items, "   ")).toEqual(items);
  });

  it("returns only items whose name partially matches the term", () => {
    expect(filterIncompleteDataSuggestions(items, "mate")).toEqual([items[0]]);
  });

  it("returns an empty array when no item matches", () => {
    expect(filterIncompleteDataSuggestions(items, "café")).toEqual([]);
  });

  it("matches regardless of the term's letter case", () => {
    expect(filterIncompleteDataSuggestions(items, "AZÚCAR")).toEqual([
      items[1],
    ]);
    expect(filterIncompleteDataSuggestions(items, "yerba mate")).toEqual([
      items[0],
    ]);
  });
});

describe("hasSupplierAssociation", () => {
  it("returns false for an empty list", () => {
    expect(hasSupplierAssociation([], "supplier-1")).toBe(false);
  });

  it("returns true when the supplier is the preferred association", () => {
    const associations = [
      association({ supplier_id: "supplier-1", preferred: true }),
    ];
    expect(hasSupplierAssociation(associations, "supplier-1")).toBe(true);
  });

  it("returns true when the supplier is a non-preferred association", () => {
    const associations = [
      association({ supplier_id: "supplier-1", preferred: false }),
    ];
    expect(hasSupplierAssociation(associations, "supplier-1")).toBe(true);
  });

  it("returns false when the supplier is not in the list", () => {
    const associations = [
      association({ supplier_id: "supplier-2", preferred: true }),
    ];
    expect(hasSupplierAssociation(associations, "supplier-1")).toBe(false);
  });
});

describe("summarizePurchaseOrderDraft", () => {
  it("computes the subtotal and total for a single item", () => {
    const result = summarizePurchaseOrderDraft([
      {
        productId: "product-1",
        productName: "Producto A",
        quantity: 3,
        unitCost: "10.00",
      },
    ]);
    expect(result.lines).toEqual([
      {
        productId: "product-1",
        productName: "Producto A",
        quantity: 3,
        unitCost: "10.00",
        subtotal: "30.00",
      },
    ]);
    expect(result.total).toBe("30.00");
  });

  it("sums subtotals across several items", () => {
    const result = summarizePurchaseOrderDraft([
      {
        productId: "product-1",
        productName: "Producto A",
        quantity: 2,
        unitCost: "5.50",
      },
      {
        productId: "product-2",
        productName: "Producto B",
        quantity: 4,
        unitCost: "1.25",
      },
    ]);
    expect(result.lines.map((line) => line.subtotal)).toEqual([
      "11.00",
      "5.00",
    ]);
    expect(result.total).toBe("16.00");
  });

  it("handles decimal unit costs without floating-point drift", () => {
    const result = summarizePurchaseOrderDraft([
      {
        productId: "product-1",
        productName: "Producto A",
        quantity: 3,
        unitCost: "0.10",
      },
    ]);
    expect(result.lines[0].subtotal).toBe("0.30");
    expect(result.total).toBe("0.30");
  });

  it("returns a zero total for an empty draft", () => {
    const result = summarizePurchaseOrderDraft([]);
    expect(result.lines).toEqual([]);
    expect(result.total).toBe("0.00");
  });
});

describe("appendSupplierAssociation", () => {
  it("appends the new supplier as non-preferred when the list is empty", () => {
    const result = appendSupplierAssociation([], "supplier-1");
    expect(result).toEqual({
      suppliers: [{ supplier_id: "supplier-1", preferred: false }],
    });
  });

  it("keeps existing preferred and non-preferred associations when appending", () => {
    const associations = [
      association({ supplier_id: "supplier-1", preferred: true }),
      association({
        supplier_id: "supplier-2",
        preferred: false,
        replenishment_frequency_days: 7,
      }),
    ];
    const result = appendSupplierAssociation(associations, "supplier-3");
    expect(result).toEqual({
      suppliers: [
        { supplier_id: "supplier-1", preferred: true },
        {
          supplier_id: "supplier-2",
          preferred: false,
          replenishment_frequency_days: 7,
        },
        { supplier_id: "supplier-3", preferred: false },
      ],
    });
  });
});

describe("toOrderedAtPayload", () => {
  it("appends midnight UTC to a YYYY-MM-DD date input", () => {
    expect(toOrderedAtPayload("2026-07-30")).toBe("2026-07-30T00:00:00Z");
  });
});
