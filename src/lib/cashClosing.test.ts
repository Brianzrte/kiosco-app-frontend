import { describe, expect, it } from "vitest";
import {
  cashDifference,
  isCountedCash,
  openingFundStatusLabel,
  reconciliationStatusLabel,
  reconciliationStatusTone,
} from "./cashClosing";

describe("cash closing amounts", () => {
  it("accepts non-negative decimal strings with up to two fraction digits", () => {
    expect(isCountedCash("0")).toBe(true);
    expect(isCountedCash("1234.50")).toBe(true);
    expect(isCountedCash("12.345")).toBe(false);
    expect(isCountedCash("-1.00")).toBe(false);
    expect(isCountedCash("abc")).toBe(false);
  });

  it("calculates the difference through integer cents", () => {
    expect(cashDifference("100.10", "99.99")).toBe("-0.11");
    expect(cashDifference("100.10", "101.00")).toBe("0.90");
    expect(cashDifference("100.10", "100.10")).toBe("0.00");
  });

  it("does not calculate a difference for invalid input", () => {
    expect(cashDifference("100.00", "100.001")).toBeNull();
  });

  it("maps every backend reconciliation status to accessible display text", () => {
    expect(reconciliationStatusLabel("IN_PROGRESS")).toBe("Caja en curso");
    expect(reconciliationStatusLabel("CLOSED")).toBe("Cierre registrado");
    expect(reconciliationStatusLabel("REQUIRES_UPDATE")).toBe(
      "Pendiente de actualizar",
    );
    expect(reconciliationStatusLabel("UNCLOSED")).toBe("Sin cerrar");
    expect(reconciliationStatusLabel("NO_ACTIVITY")).toBe("Sin actividad");
  });

  it("uses semantic tones without deriving business status", () => {
    expect(reconciliationStatusTone("CLOSED")).toBe("success");
    expect(reconciliationStatusTone("IN_PROGRESS")).toBe("warning");
    expect(reconciliationStatusTone("UNCLOSED")).toBe("error");
    expect(reconciliationStatusTone("NO_ACTIVITY")).toBe("neutral");
  });

  it("maps opening-fund states to visible text", () => {
    expect(openingFundStatusLabel("declared")).toBe("Fondo declarado");
    expect(openingFundStatusLabel("confirmed")).toBe("Fondo confirmado");
  });
});
