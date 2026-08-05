import { describe, expect, it } from "vitest";
import {
  appendSupplierAssociation,
  buildLastPurchaseOrderQuery,
  buildPurchaseOrdersQuery,
  buildPurchasesBySupplierQuery,
  buildReceptionPayload,
  classifyPurchaseOrderSchedule,
  derivePurchaseOrderPreloadDraft,
  describeReceptionLineResolution,
  filterIncompleteDataSuggestions,
  formatQuantity,
  hasSupplierAssociation,
  isValidReceivedQuantity,
  isValidPurchaseQuantity,
  purchaseOrderPreloadExclusionReasonLabel,
  purchaseOrderStatusLabel,
  purchaseOrderScheduleBounds,
  purchasePaymentMethodLabel,
  quantityUnit,
  ReceptionResolutionState,
  splitReplenishmentSuggestions,
  summarizePurchaseOrderDraft,
  summarizeReceptionResolution,
  supplierLabel,
  toOrderedAtPayload,
} from "./purchasing";
import {
  Product,
  ProductSupplier,
  PurchaseOrderItem,
  ReplenishmentSuggestion,
} from "./types";

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

  it("passes expected-date filters as calendar days and requests expected order", () => {
    const params = new URLSearchParams(
      buildPurchaseOrdersQuery({
        supplierId: "",
        from: "",
        to: "",
        status: "PENDING",
        expectedFrom: "2026-08-04",
        expectedTo: "2026-08-05",
        orderByExpected: true,
        page: 1,
      }),
    );
    expect(params.get("expected_from")).toBe("2026-08-04");
    expect(params.get("expected_to")).toBe("2026-08-05");
    expect(params.get("order_by")).toBe("expected_at");
  });
});

describe("purchase-order schedule", () => {
  const now = new Date("2026-08-04T02:30:00.000Z"); // 23:30 on Aug 3 in Buenos Aires.

  it("uses the business calendar day at the midnight boundary", () => {
    expect(
      classifyPurchaseOrderSchedule(
        { expected_at: "2026-08-03T12:00:00-03:00" },
        now,
      ),
    ).toBe("today");
  });

  it("classifies missing, overdue and upcoming target dates", () => {
    expect(classifyPurchaseOrderSchedule({ expected_at: null }, now)).toBe(
      "no_expected_date",
    );
    expect(
      classifyPurchaseOrderSchedule(
        { expected_at: "2026-08-02T12:00:00-03:00" },
        now,
      ),
    ).toBe("overdue");
    expect(
      classifyPurchaseOrderSchedule(
        { expected_at: "2026-08-09T12:00:00-03:00" },
        now,
      ),
    ).toBe("this_week");
    expect(
      classifyPurchaseOrderSchedule(
        { expected_at: "2026-08-10T12:00:00-03:00" },
        now,
      ),
    ).toBe("no_expected_date");
  });

  it("uses exclusive backend bounds without overlapping today and this week", () => {
    expect(purchaseOrderScheduleBounds("2026-08-04", "", "today")).toEqual({
      expectedTo: "2026-08-05",
    });
    expect(purchaseOrderScheduleBounds("2026-08-04", "", "week")).toEqual({
      expectedFrom: "2026-08-05",
      expectedTo: "2026-08-11",
    });
  });

  it("narrows only the matching schedule region for a target-date filter", () => {
    expect(
      purchaseOrderScheduleBounds("2026-08-04", "2026-08-02", "today"),
    ).toEqual({ expectedFrom: "2026-08-02", expectedTo: "2026-08-03" });
    expect(
      purchaseOrderScheduleBounds("2026-08-04", "2026-08-02", "week"),
    ).toBeNull();
    expect(
      purchaseOrderScheduleBounds("2026-08-04", "2026-08-07", "week"),
    ).toEqual({ expectedFrom: "2026-08-07", expectedTo: "2026-08-08" });
  });
});

describe("purchase quantity", () => {
  it("derives kilograms only for weighable catalog products", () => {
    expect(quantityUnit(product({ unit_type: "pesable" }))).toBe("kg");
    expect(quantityUnit(product({ unit_type: "unitario" }))).toBe("un");
    expect(quantityUnit()).toBe("un");
  });

  it("accepts positive values up to three decimals", () => {
    expect(isValidPurchaseQuantity("15.125")).toBe(true);
    expect(isValidPurchaseQuantity("0")).toBe(false);
    expect(isValidPurchaseQuantity("-1")).toBe(false);
    expect(isValidPurchaseQuantity("15.1234")).toBe(false);
    expect(isValidPurchaseQuantity("")).toBe(false);
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
      supplierLabel({ id: "supplier-1", name: "Mayorista", active: true, phone: null, address: null, visit_frequency_days: null, visit_notes: null, notes: null }),
    ).toBe("Mayorista");
    expect(
      supplierLabel({ id: "supplier-1", name: "Mayorista", active: false, phone: null, address: null, visit_frequency_days: null, visit_notes: null, notes: null }),
    ).toBe("Mayorista (inactivo)");
  });
});

describe("formatQuantity", () => {
  it("drops the backend's fixed 3-decimal padding for whole quantities", () => {
    expect(formatQuantity("8.000")).toBe("8");
    expect(formatQuantity("0.000")).toBe("0");
  });

  it("keeps real decimals for a fractional quantity", () => {
    expect(formatQuantity("1.500")).toBe("1,5");
    expect(formatQuantity("2.250")).toBe("2,25");
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
        quantity: "3",
        unitCost: "10.00",
      },
    ]);
    expect(result.lines).toEqual([
      {
        productId: "product-1",
        productName: "Producto A",
        quantity: "3",
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
        quantity: "2",
        unitCost: "5.50",
      },
      {
        productId: "product-2",
        productName: "Producto B",
        quantity: "4",
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
        quantity: "3",
        unitCost: "0.10",
      },
    ]);
    expect(result.lines[0].subtotal).toBe("0.30");
    expect(result.total).toBe("0.30");
  });

  it("uses scaled integers for fractional quantities", () => {
    const result = summarizePurchaseOrderDraft([
      {
        productId: "product-1",
        productName: "Pan",
        quantity: "1.250",
        unitCost: "10.00",
      },
    ]);
    expect(result.lines[0].subtotal).toBe("12.50");
    expect(result.total).toBe("12.50");
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

describe("buildLastPurchaseOrderQuery", () => {
  it("asks for page=1&limit=1 filtered by supplier", () => {
    const params = new URLSearchParams(
      buildLastPurchaseOrderQuery("supplier-1"),
    );
    expect(params.get("supplier_id")).toBe("supplier-1");
    expect(params.get("page")).toBe("1");
    expect(params.get("limit")).toBe("1");
  });
});

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    sku: "SKU-1",
    barcode: null,
    name: "Producto",
    category_id: "category-1",
    price: "10.00",
    cost: "5.00",
    sells_by_unit: true,
    units_per_package: 1,
    extra_margin_percent: "0",
    parent_product_id: null,
    unit_product: null,
    active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function purchaseOrderItem(
  overrides: Partial<PurchaseOrderItem> = {},
): PurchaseOrderItem {
  return {
    id: "item-1",
    product_id: "product-1",
    product_name: "Producto",
    quantity: "3",
    received_quantity: "0",
    unit_cost: "5.00",
    subtotal: "15.00",
    ...overrides,
  };
}

describe("derivePurchaseOrderPreloadDraft", () => {
  it("preloads an eligible line with its previous quantity and cost", () => {
    const catalog = [product({ id: "product-1", active: true })];
    const result = derivePurchaseOrderPreloadDraft(
      { items: [purchaseOrderItem()] },
      catalog,
    );
    expect(result.lines).toEqual([
      {
        productId: "product-1",
        productName: "Producto",
        quantity: "3",
        unitCost: "5.00",
      },
    ]);
    expect(result.exclusions).toEqual([]);
  });

  it("excludes a removed line with reason 'removed'", () => {
    const catalog = [product({ id: "product-1" })];
    const result = derivePurchaseOrderPreloadDraft(
      {
        items: [purchaseOrderItem({ removed_at: "2026-07-01T00:00:00Z" })],
      },
      catalog,
    );
    expect(result.lines).toEqual([]);
    expect(result.exclusions).toEqual([
      { productName: "Producto", reason: "removed" },
    ]);
  });

  it("excludes a free-text line with reason 'free_text'", () => {
    const result = derivePurchaseOrderPreloadDraft(
      {
        items: [
          purchaseOrderItem({
            product_id: undefined,
            product_name: undefined,
            description: "Producto sin catálogo",
          }),
        ],
      },
      [],
    );
    expect(result.lines).toEqual([]);
    expect(result.exclusions).toEqual([
      { productName: "Producto sin catálogo", reason: "free_text" },
    ]);
  });

  it("excludes a line whose product is inactive in the loaded catalog", () => {
    const catalog = [product({ id: "product-1", active: false })];
    const result = derivePurchaseOrderPreloadDraft(
      { items: [purchaseOrderItem()] },
      catalog,
    );
    expect(result.lines).toEqual([]);
    expect(result.exclusions).toEqual([
      { productName: "Producto", reason: "inactive_product" },
    ]);
  });

  it("excludes a line whose product is absent from the loaded catalog", () => {
    const result = derivePurchaseOrderPreloadDraft(
      { items: [purchaseOrderItem()] },
      [],
    );
    expect(result.lines).toEqual([]);
    expect(result.exclusions).toEqual([
      { productName: "Producto", reason: "missing_product" },
    ]);
  });

  it("returns no lines for an order with no eligible items", () => {
    const result = derivePurchaseOrderPreloadDraft(
      {
        items: [
          purchaseOrderItem({ removed_at: "2026-07-01T00:00:00Z" }),
          purchaseOrderItem({
            id: "item-2",
            product_id: undefined,
            product_name: undefined,
            description: "Texto libre",
          }),
        ],
      },
      [],
    );
    expect(result.lines).toEqual([]);
    expect(result.exclusions).toHaveLength(2);
  });

  it("preloads from a CANCELLED source order the same as any other", () => {
    const catalog = [product({ id: "product-1" })];
    const result = derivePurchaseOrderPreloadDraft(
      { items: [purchaseOrderItem()] },
      catalog,
    );
    expect(result.lines).toHaveLength(1);
  });
});

describe("buildReceptionPayload", () => {
  it("sends full quantity with no reason for a fully received line", () => {
    const items = [purchaseOrderItem({ id: "item-1", quantity: "5" })];
    const resolutions: ReceptionResolutionState = {
      "item-1": { action: "received_all" },
    };
    expect(buildReceptionPayload(items, resolutions)).toEqual([
      { item_id: "item-1", received_quantity: "5" },
    ]);
  });

  it("includes the reason for a partially received line", () => {
    const items = [purchaseOrderItem({ id: "item-1", quantity: "5" })];
    const resolutions: ReceptionResolutionState = {
      "item-1": {
        action: "received_partial",
        receivedQuantity: "2",
        reason: "Faltó stock",
      },
    };
    expect(buildReceptionPayload(items, resolutions)).toEqual([
      {
        item_id: "item-1",
        received_quantity: "2",
        non_delivery_reason: "Faltó stock",
      },
    ]);
  });

  it("sends zero with the reason for a line that was not delivered", () => {
    const items = [purchaseOrderItem({ id: "item-1", quantity: "5" })];
    const resolutions: ReceptionResolutionState = {
      "item-1": { action: "not_delivered", reason: "No llegó" },
    };
    expect(buildReceptionPayload(items, resolutions)).toEqual([
      {
        item_id: "item-1",
        received_quantity: "0",
        non_delivery_reason: "No llegó",
      },
    ]);
  });

  it("throws when an active item has no resolution yet", () => {
    const items = [purchaseOrderItem({ id: "item-1" })];
    expect(() => buildReceptionPayload(items, {})).toThrow();
  });
});

describe("summarizeReceptionResolution", () => {
  it("counts resolved lines and outcomes as a reception when something arrived", () => {
    const items = [
      purchaseOrderItem({ id: "item-1", quantity: "5" }),
      purchaseOrderItem({ id: "item-2", quantity: "2" }),
    ];
    const resolutions: ReceptionResolutionState = {
      "item-1": { action: "received_all" },
    };
    expect(summarizeReceptionResolution(items, resolutions)).toEqual({
      resolvedCount: 1,
      totalCount: 2,
      outcome: "receive",
    });
  });

  it("outcomes as a cancellation when every resolved line received nothing", () => {
    const items = [purchaseOrderItem({ id: "item-1", quantity: "5" })];
    const resolutions: ReceptionResolutionState = {
      "item-1": { action: "not_delivered", reason: "No llegó" },
    };
    expect(summarizeReceptionResolution(items, resolutions)).toEqual({
      resolvedCount: 1,
      totalCount: 1,
      outcome: "cancel",
    });
  });

  it("outcomes as a cancellation when a partial resolution received zero", () => {
    const items = [purchaseOrderItem({ id: "item-1", quantity: "5" })];
    const resolutions: ReceptionResolutionState = {
      "item-1": {
        action: "received_partial",
        receivedQuantity: "0",
        reason: "No llegó nada",
      },
    };
    expect(summarizeReceptionResolution(items, resolutions).outcome).toBe(
      "cancel",
    );
  });
});

describe("isValidReceivedQuantity", () => {
  it("accepts an integer between zero and the requested quantity", () => {
    expect(isValidReceivedQuantity("0", "5")).toBe(true);
    expect(isValidReceivedQuantity("5", "5")).toBe(true);
    expect(isValidReceivedQuantity("3", "5")).toBe(true);
  });

  it("rejects a quantity above what was requested", () => {
    expect(isValidReceivedQuantity("6", "5")).toBe(false);
  });

  it("rejects a negative or non-integer quantity", () => {
    expect(isValidReceivedQuantity("-1", "5")).toBe(false);
    expect(isValidReceivedQuantity("1.2345", "5")).toBe(false);
  });
});

describe("purchaseOrderPreloadExclusionReasonLabel", () => {
  it("has Spanish copy for each exclusion reason", () => {
    expect(purchaseOrderPreloadExclusionReasonLabel("removed")).toBe(
      "se había quitado de aquel pedido",
    );
    expect(purchaseOrderPreloadExclusionReasonLabel("free_text")).toBe(
      "era un ítem de texto libre, sin producto del catálogo",
    );
    expect(purchaseOrderPreloadExclusionReasonLabel("inactive_product")).toBe(
      "el producto está inactivo en el catálogo",
    );
    expect(purchaseOrderPreloadExclusionReasonLabel("missing_product")).toBe(
      "el producto ya no está en el catálogo cargado",
    );
  });
});

describe("describeReceptionLineResolution", () => {
  it("describes a fully received line with the requested quantity", () => {
    expect(describeReceptionLineResolution({ action: "received_all" }, "5")).toBe(
      "Recibido completo: 5/5",
    );
  });

  it("describes a partially received line with quantity and reason", () => {
    expect(
      describeReceptionLineResolution(
        {
          action: "received_partial",
        receivedQuantity: "2",
          reason: "Faltó stock",
        },
      "5",
      ),
    ).toBe("Recibido parcial: 2 de 5 · Motivo: Faltó stock");
  });

  it("describes a not-delivered line with its reason", () => {
    expect(
      describeReceptionLineResolution(
        { action: "not_delivered", reason: "No llegó" },
      "5",
      ),
    ).toBe("Fuera del pedido · Motivo: No llegó");
  });
});
