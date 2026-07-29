import { describe, expect, it } from "vitest";
import { homeFor, navItemsFor } from "./nav";

describe("homeFor", () => {
  it("uses the fixed role priority", () => {
    expect(homeFor(["receiving", "inventory"])).toBe("/receiving");
    expect(homeFor(["cashier", "receiving"])).toBe("/");
    expect(homeFor(["admin", "cashier"])).toBe("/");
  });
});

describe("navItemsFor", () => {
  it("returns the union of the sections allowed by every role", () => {
    const hrefs = navItemsFor(["cashier", "receiving"]).map((item) => item.href);

    expect(hrefs).toEqual([
      "/",
      "/sales",
      "/inventory",
      "/receiving",
    ]);
  });
});
