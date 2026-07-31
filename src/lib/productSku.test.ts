import { describe, expect, it } from "vitest";
import { canApplySkuSuggestion, isAutomaticSku } from "./productSku";

describe("product SKU helpers", () => {
  it("recognizes only the automatic SKU format", () => {
    expect(isAutomaticSku("SKU-001")).toBe(true);
    expect(isAutomaticSku("SKU-999")).toBe(true);
    expect(isAutomaticSku("SKU-1")).toBe(false);
    expect(isAutomaticSku("CAT-001")).toBe(false);
  });

  it("allows suggestions before manual editing", () => {
    expect(canApplySkuSuggestion(false)).toBe(true);
  });

  it("protects every manually edited value", () => {
    expect(canApplySkuSuggestion(true)).toBe(false);
  });
});
