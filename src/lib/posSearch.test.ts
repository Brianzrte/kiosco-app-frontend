import { describe, expect, it } from "vitest";
import { buildPosSearchQuery } from "./posSearch";

describe("buildPosSearchQuery", () => {
  it("encodes the term and always limits results to active products", () => {
    const query = buildPosSearchQuery("café & té");
    const params = new URLSearchParams(query);

    expect(params.get("q")).toBe("café & té");
    expect(params.get("active")).toBe("true");
    expect(params.get("limit")).toBe("8");
  });

  it("builds the expected query for a representative non-empty term", () => {
    expect(buildPosSearchQuery("gaseosa")).toBe(
      "q=gaseosa&active=true&limit=8",
    );
  });
});
