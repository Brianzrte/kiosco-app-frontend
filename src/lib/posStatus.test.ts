import { describe, expect, it } from "vitest";
import {
  resolveCheckoutStatus,
  resolveEntryStatus,
  type CheckoutStatusInput,
  type EntryStatusInput,
} from "./posStatus";

function entryInput(overrides: Partial<EntryStatusInput> = {}): EntryStatusInput {
  return {
    unknownBarcodeMessage: null,
    inactiveProductMessage: null,
    stockLimitMessage: null,
    searchErrorMessage: null,
    searchStatusMessage: null,
    ...overrides,
  };
}

describe("resolveEntryStatus", () => {
  it("shows nothing when no condition is active", () => {
    expect(resolveEntryStatus(entryInput())).toBeNull();
  });

  it("unknown barcode outranks a stale search status message", () => {
    const result = resolveEntryStatus(
      entryInput({
        unknownBarcodeMessage: "No hay ningún producto con ese código.",
        searchStatusMessage: "Buscando…",
      }),
    );
    expect(result).toBe("No hay ningún producto con ese código.");
  });

  it("unknown barcode outranks every other condition at once", () => {
    const result = resolveEntryStatus(
      entryInput({
        unknownBarcodeMessage: "unknown",
        inactiveProductMessage: "inactive",
        stockLimitMessage: "stock",
        searchErrorMessage: "search",
        searchStatusMessage: "search",
      }),
    );
    expect(result).toBe("unknown");
  });

  it("inactive product outranks stock limit and search error", () => {
    const result = resolveEntryStatus(
      entryInput({
        inactiveProductMessage: "inactive",
        stockLimitMessage: "stock",
        searchErrorMessage: "search",
      }),
    );
    expect(result).toBe("inactive");
  });

  it("stock-limit message outranks the search error", () => {
    const result = resolveEntryStatus(
      entryInput({
        stockLimitMessage: "Solo hay 2 unidades disponibles.",
        searchErrorMessage: "No se pudo buscar productos",
      }),
    );
    expect(result).toBe("Solo hay 2 unidades disponibles.");
  });

  it("search error outranks the search status message", () => {
    const result = resolveEntryStatus(
      entryInput({
        searchErrorMessage: "No se pudo buscar productos",
        searchStatusMessage: "Buscando…",
      }),
    );
    expect(result).toBe("No se pudo buscar productos");
  });

  it("falls back to the search status message alone", () => {
    const result = resolveEntryStatus(
      entryInput({ searchStatusMessage: "Ningún producto activo coincide…" }),
    );
    expect(result).toBe("Ningún producto activo coincide…");
  });
});

function checkoutInput(
  overrides: Partial<CheckoutStatusInput> = {},
): CheckoutStatusInput {
  return {
    unknownNetworkState: false,
    unknownNetworkMessage: "Falló la conexión y no se sabe si la venta se confirmó.",
    confirmErrorMessage: null,
    pendingBalanceMessage: null,
    confirmDisabledReason: null,
    settledMessage: "Pago cerrado",
    ...overrides,
  };
}

describe("resolveCheckoutStatus", () => {
  it("shows the settled message when nothing else is active", () => {
    expect(resolveCheckoutStatus(checkoutInput())).toEqual({
      kind: "settled",
      message: "Pago cerrado",
    });
  });

  it("unknown network state outranks a leftover confirmation error", () => {
    const result = resolveCheckoutStatus(
      checkoutInput({
        unknownNetworkState: true,
        confirmErrorMessage: "Stock insuficiente",
      }),
    );
    expect(result.kind).toBe("network");
  });

  it("unknown network state outranks every other condition at once", () => {
    const result = resolveCheckoutStatus(
      checkoutInput({
        unknownNetworkState: true,
        confirmErrorMessage: "confirm error",
        pendingBalanceMessage: "Falta $10,00",
        confirmDisabledReason: "Elegí un medio de pago",
      }),
    );
    expect(result.kind).toBe("network");
    expect(result.message).toBe(
      "Falló la conexión y no se sabe si la venta se confirmó.",
    );
  });

  it("confirmation error outranks a pending balance message", () => {
    const result = resolveCheckoutStatus(
      checkoutInput({
        confirmErrorMessage: "Stock insuficiente para confirmar",
        pendingBalanceMessage: "Falta $10,00",
      }),
    );
    expect(result).toEqual({
      kind: "confirmError",
      message: "Stock insuficiente para confirmar",
    });
  });

  it("pending balance outranks the confirmation-blocked reason", () => {
    const result = resolveCheckoutStatus(
      checkoutInput({
        pendingBalanceMessage: "Falta $10,00",
        confirmDisabledReason: "Ingresá un peso válido",
      }),
    );
    expect(result).toEqual({ kind: "balance", message: "Falta $10,00" });
  });

  it("confirmation-blocked reason outranks the settled message", () => {
    const result = resolveCheckoutStatus(
      checkoutInput({ confirmDisabledReason: "Ingresá un peso válido para “Tomate”" }),
    );
    expect(result).toEqual({
      kind: "blocked",
      message: "Ingresá un peso válido para “Tomate”",
    });
  });
});
