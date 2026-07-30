import { describe, expect, it } from "vitest";
import {
  buildPurchaseOrdersQuery,
  buildPurchasesBySupplierQuery,
  purchaseOrderStatusLabel,
  purchasePaymentMethodLabel,
  supplierLabel,
  toOrderedAtPayload,
} from "./purchasing";

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

describe("toOrderedAtPayload", () => {
  it("appends midnight UTC to a YYYY-MM-DD date input", () => {
    expect(toOrderedAtPayload("2026-07-30")).toBe("2026-07-30T00:00:00Z");
  });
});
