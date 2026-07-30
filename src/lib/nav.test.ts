import { describe, expect, it } from "vitest";
import { homeFor, navItemsFor } from "./nav";

describe("homeFor", () => {
  it("uses the fixed role priority", () => {
    expect(homeFor(["receiving", "inventory"])).toBe("/purchasing");
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
      "/purchasing",
    ]);
  });

  it("does not expose management-only routes to receiving", () => {
    expect(navItemsFor(["receiving"]).map((item) => item.href)).toEqual([
      "/inventory",
      "/purchasing",
    ]);
  });
});
