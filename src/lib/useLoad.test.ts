import { describe, expect, it } from "vitest";
import { shouldPoll } from "./useLoad";

describe("shouldPoll", () => {
  it("polls only while the document is visible", () => {
    expect(shouldPoll("visible")).toBe(true);
    expect(shouldPoll("hidden")).toBe(false);
  });

  it("allows polling outside browser contexts", () => {
    expect(shouldPoll(undefined)).toBe(true);
  });
});
