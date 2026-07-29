import { describe, expect, it } from "vitest";
import { hasAnyRole, parseRoles } from "./roles";

describe("parseRoles", () => {
  it("returns an empty set for a missing cookie", () => {
    expect(parseRoles(undefined)).toEqual([]);
  });

  it("discards unknown roles", () => {
    expect(parseRoles("cashier,unknown,receiving")).toEqual([
      "cashier",
      "receiving",
    ]);
  });
});

describe("hasAnyRole", () => {
  it("matches the union of the assigned roles", () => {
    expect(hasAnyRole(["cashier", "receiving"], ["admin", "receiving"])).toBe(
      true,
    );
    expect(hasAnyRole(["cashier"], ["admin", "receiving"])).toBe(false);
  });
});
