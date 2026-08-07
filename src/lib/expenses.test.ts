import { describe, expect, it } from "vitest";
import {
  affectsCashRegister,
  allowsEditableUnitCost,
  barPercent,
  buildExpensePayload,
  canVoid,
  categoryBucketLabel,
  currentMonthRange,
  discardedByTypeChange,
  expenseCountsTowardClosing,
  expenseFiltersToQuery,
  ExpenseFormInput,
  normalizedSummaryEntries,
  SELECTABLE_EXPENSE_TYPES,
  summaryEntries,
  voidImpactMessage,
} from "./expenses";
import { Expense } from "./types";

function form(overrides: Partial<ExpenseFormInput> = {}): ExpenseFormInput {
  return {
    type: "OPERATING",
    businessDate: "2026-08-05",
    amount: "8500.00",
    paymentMethod: "CASH_REGISTER",
    categoryId: "cat-combustible",
    description: "  Nafta para el reparto  ",
    supplierId: "",
    lines: [],
    ...overrides,
  };
}

describe("SELECTABLE_EXPENSE_TYPES", () => {
  it("never offers payroll, which only the settlement creates", () => {
    expect(SELECTABLE_EXPENSE_TYPES).not.toContain("PAYROLL");
  });
});

describe("affectsCashRegister", () => {
  it("is decided by the payment method alone", () => {
    expect(affectsCashRegister("CASH_REGISTER")).toBe(true);
    expect(affectsCashRegister("OWNER_FUNDS")).toBe(false);
    expect(affectsCashRegister("TRANSFER")).toBe(false);
    expect(affectsCashRegister("CARD")).toBe(false);
  });
});

describe("buildExpensePayload", () => {
  it("builds an operating expense and trims the description", () => {
    expect(buildExpensePayload(form())).toEqual({
      type: "OPERATING",
      business_date: "2026-08-05",
      payment_method: "CASH_REGISTER",
      description: "Nafta para el reparto",
      amount: "8500.00",
      expense_category_id: "cat-combustible",
    });
  });

  it("rejects payroll, which cannot be created by hand", () => {
    expect(buildExpensePayload(form({ type: "PAYROLL" }))).toBeNull();
  });

  it("sends no category for an owner draw", () => {
    const payload = buildExpensePayload(
      form({ type: "OWNER_DRAW", categoryId: "" }),
    );

    expect(payload).not.toBeNull();
    expect(payload).not.toHaveProperty("expense_category_id");
  });

  it("requires a category for every other type", () => {
    expect(buildExpensePayload(form({ categoryId: "" }))).toBeNull();
  });

  it("sends a placeholder amount for self-consumption, which the backend values at cost and ignores", () => {
    // El backend exige `amount` parseable en el body incluso cuando lo
    // ignora — verificado en vivo el 2026-08-06: sin esta clave, un
    // `SELF_CONSUMPTION` con items responde `400` antes de valorizar.
    const payload = buildExpensePayload(
      form({
        type: "SELF_CONSUMPTION",
        amount: "",
        lines: [{ productId: "p-1", quantity: "1.500", unitCost: "950.00" }],
      }),
    );

    expect(payload).not.toBeNull();
    expect(payload?.amount).toBe("0");
    expect(payload).toMatchObject({
      items: [{ product_id: "p-1", quantity: "1.500" }],
    });
  });

  it("does not send a typed unit cost for self-consumption", () => {
    const payload = buildExpensePayload(
      form({
        type: "SELF_CONSUMPTION",
        amount: "",
        lines: [{ productId: "p-1", quantity: "2", unitCost: "1.00" }],
      }),
    );

    expect(payload?.items?.[0]).not.toHaveProperty("unit_cost");
  });

  it("keeps the typed unit cost for a purchase", () => {
    expect(allowsEditableUnitCost("PURCHASE")).toBe(true);

    const payload = buildExpensePayload(
      form({
        type: "PURCHASE",
        supplierId: "sup-1",
        lines: [{ productId: "p-1", quantity: "3", unitCost: "2000.00" }],
      }),
    );

    expect(payload).toMatchObject({
      supplier_id: "sup-1",
      items: [{ product_id: "p-1", quantity: "3", unit_cost: "2000.00" }],
    });
  });

  it("requires at least one line for self-consumption", () => {
    expect(
      buildExpensePayload(
        form({ type: "SELF_CONSUMPTION", amount: "", lines: [] }),
      ),
    ).toBeNull();
  });

  it("keeps quantities and amounts as decimal strings", () => {
    const payload = buildExpensePayload(
      form({
        type: "PURCHASE",
        amount: "45200.50",
        lines: [{ productId: "p-1", quantity: "15.500", unitCost: "0.001" }],
      }),
    );

    expect(payload?.amount).toBe("45200.50");
    expect(payload?.items?.[0].quantity).toBe("15.500");
    expect(payload?.items?.[0].unit_cost).toBe("0.001");
  });

  it("drops incomplete lines instead of sending them", () => {
    const payload = buildExpensePayload(
      form({
        type: "PURCHASE",
        lines: [
          { productId: "p-1", quantity: "2", unitCost: "10.00" },
          { productId: "", quantity: "", unitCost: "" },
        ],
      }),
    );

    expect(payload?.items).toHaveLength(1);
  });
});

describe("discardedByTypeChange", () => {
  it("reports the lines lost when leaving a type that has them", () => {
    expect(discardedByTypeChange("PURCHASE", "OPERATING")).toEqual([
      "lines",
      "supplier",
    ]);
  });

  it("reports the category lost when moving to an owner draw", () => {
    expect(discardedByTypeChange("OPERATING", "OWNER_DRAW")).toEqual([
      "category",
    ]);
  });

  it("loses nothing between two types that share their fields", () => {
    expect(discardedByTypeChange("PURCHASE", "SELF_CONSUMPTION")).toEqual([
      "supplier",
    ]);
    expect(discardedByTypeChange("OPERATING", "OPERATING")).toEqual([]);
  });
});

describe("expenseFiltersToQuery", () => {
  it("omits unset filters and always sends the page", () => {
    expect(
      expenseFiltersToQuery(
        {
          from: "2026-08-01",
          to: "2026-08-31",
          type: "",
          categoryId: "",
          paymentMethod: "",
          status: "",
        },
        1,
      ),
    ).toBe("from=2026-08-01&to=2026-08-31&page=1");
  });

  it("sends every applied filter", () => {
    expect(
      expenseFiltersToQuery(
        {
          from: "",
          to: "",
          type: "OWNER_DRAW",
          categoryId: "cat-1",
          paymentMethod: "CASH_REGISTER",
          status: "VOID",
        },
        2,
      ),
    ).toBe(
      "type=OWNER_DRAW&expense_category_id=cat-1&payment_method=CASH_REGISTER&status=VOID&page=2",
    );
  });
});

describe("voidImpactMessage", () => {
  it("names the consequence of each type instead of a generic warning", () => {
    expect(voidImpactMessage("SELF_CONSUMPTION")).toContain("stock");
    expect(voidImpactMessage("PAYROLL")).toContain("liquidación");
    expect(voidImpactMessage("PURCHASE")).toContain("Inventario");
    expect(voidImpactMessage("OWNER_DRAW")).toContain("retiro");
  });
});

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "exp-1",
    business_date: "2026-08-05",
    type: "OPERATING",
    expense_category_id: "cat-1",
    payment_method: "OWNER_FUNDS",
    amount: "100.00",
    description: "Test",
    status: "ACTIVE",
    created_by: "user-1",
    created_at: "2026-08-05T10:00:00Z",
    ...overrides,
  };
}

describe("expenseCountsTowardClosing", () => {
  it("counts an active cash expense associated with a shift", () => {
    expect(
      expenseCountsTowardClosing({
        payment_method: "CASH_REGISTER",
        cash_shift_id: "shift-1",
        status: "ACTIVE",
      }),
    ).toBe(true);
  });

  it("does not count a cash expense with no shift association", () => {
    expect(
      expenseCountsTowardClosing({
        payment_method: "CASH_REGISTER",
        cash_shift_id: undefined,
        status: "ACTIVE",
      }),
    ).toBe(false);
  });

  it("does not count a non-cash expense even with a shift id", () => {
    expect(
      expenseCountsTowardClosing({
        payment_method: "OWNER_FUNDS",
        cash_shift_id: "shift-1",
        status: "ACTIVE",
      }),
    ).toBe(false);
  });

  it("does not count a voided expense", () => {
    expect(
      expenseCountsTowardClosing({
        payment_method: "CASH_REGISTER",
        cash_shift_id: "shift-1",
        status: "VOID",
      }),
    ).toBe(false);
  });
});

describe("canVoid", () => {
  it("allows voiding an active expense on an unsealed day", () => {
    expect(canVoid(expense(), false)).toBe(true);
  });

  it("blocks voiding an already-voided expense", () => {
    expect(canVoid(expense({ status: "VOID" }), false)).toBe(false);
  });

  it("blocks voiding when the day is sealed, even if active", () => {
    expect(canVoid(expense(), true)).toBe(false);
  });
});

describe("currentMonthRange", () => {
  it("spans from the first of the current month to today, in the business time zone", () => {
    expect(currentMonthRange(new Date("2026-08-15T12:00:00.000Z"))).toEqual({
      from: "2026-08-01",
      to: "2026-08-15",
    });
  });

  it("crosses a month boundary at the start of the month", () => {
    // 2026-08-01T01:30 UTC is still 2026-07-31 in America/Argentina/Buenos_Aires.
    expect(currentMonthRange(new Date("2026-08-01T01:30:00.000Z"))).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });
});

describe("summaryEntries", () => {
  it("sorts by amount descending and applies the label", () => {
    const entries = summaryEntries(
      { OPERATING: "100.00", PURCHASE: "500.00", OWNER_DRAW: "50.00" },
      (key) => key.toLowerCase(),
    );
    expect(entries).toEqual([
      { key: "PURCHASE", label: "purchase", amount: "500.00" },
      { key: "OPERATING", label: "operating", amount: "100.00" },
      { key: "OWNER_DRAW", label: "owner_draw", amount: "50.00" },
    ]);
  });

  it("returns an empty list for an undefined map, never throwing", () => {
    expect(summaryEntries(undefined, (key) => key)).toEqual([]);
  });
});

describe("normalizedSummaryEntries", () => {
  it("keeps key order and defaults a missing key to zero", () => {
    expect(
      normalizedSummaryEntries(
        { CASH_REGISTER: "100.00" },
        ["CASH_REGISTER", "OWNER_FUNDS", "TRANSFER", "CARD"],
        (key) => key,
      ),
    ).toEqual([
      { key: "CASH_REGISTER", label: "CASH_REGISTER", amount: "100.00" },
      { key: "OWNER_FUNDS", label: "OWNER_FUNDS", amount: "0.00" },
      { key: "TRANSFER", label: "TRANSFER", amount: "0.00" },
      { key: "CARD", label: "CARD", amount: "0.00" },
    ]);
  });
});

describe("categoryBucketLabel", () => {
  it("labels the empty-key bucket as no category", () => {
    expect(categoryBucketLabel("")).toBe("Sin rubro");
  });

  it("passes through a real category name unchanged", () => {
    expect(categoryBucketLabel("Combustible")).toBe("Combustible");
  });
});

describe("barPercent", () => {
  it("is 100 for the max of its own group", () => {
    expect(barPercent("500.00", "500.00")).toBe(100);
  });

  it("is proportional for a smaller amount", () => {
    expect(barPercent("250.00", "500.00")).toBe(50);
  });

  it("is 0 when the group's max is zero, never dividing by zero", () => {
    expect(barPercent("0.00", "0.00")).toBe(0);
  });
});
