import { describe, expect, it } from "vitest";
import { computePageSize, pageWindow } from "./pagination";

describe("computePageSize", () => {
  const base = {
    viewportHeight: 900,
    listTop: 300,
    rowHeight: 50,
    reservedBelow: 100,
    min: 5,
    max: 15,
    fallback: 15,
  };

  it("fits the rows in the available viewport height", () => {
    expect(computePageSize(base)).toBe(10);
  });

  it("clamps to the configured maximum", () => {
    expect(computePageSize({ ...base, viewportHeight: 3000 })).toBe(15);
  });

  it("clamps to the configured minimum", () => {
    expect(computePageSize({ ...base, viewportHeight: 500 })).toBe(5);
  });

  it("uses the fallback before a row height is measurable", () => {
    expect(computePageSize({ ...base, rowHeight: 0 })).toBe(15);
  });
});

describe("pageWindow", () => {
  it("returns a bounded page without mutating the source", () => {
    const items = [1, 2, 3, 4, 5];
    expect(pageWindow(items, 2, 2)).toEqual([3, 4]);
    expect(pageWindow(items, 3, 2)).toEqual([5]);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});
