import { describe, expect, it } from "vitest";
import {
  buildWorkLogPayload,
  canEditWorkLog,
  canRecordHoursFor,
  canSettle,
  computeWorkLogAmount,
  isAdjusted,
  isSettled,
  payrollRowsFor,
  settlementTotals,
  WorkLogFormInput,
} from "./payroll";
import { PayrollPendingItem, User, WorkLog } from "./types";

function input(overrides: Partial<WorkLogFormInput> = {}): WorkLogFormInput {
  return {
    userId: "u-1",
    businessDate: "2026-08-05",
    hours: "6",
    hourlyRate: "3200.00",
    overrideAmount: "",
    adjustmentReason: "",
    ...overrides,
  };
}

function user(overrides: Partial<User> = {}): User {
  return {
    id: "u-1",
    username: "ana",
    roles: ["cashier"],
    active: true,
    first_name: "Ana",
    last_name: "Gómez",
    phone: "",
    address: "",
    hourly_rate: "3200.00",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function log(overrides: Partial<WorkLog> = {}): WorkLog {
  return {
    id: "wl-1",
    user_id: "u-1",
    business_date: "2026-08-05",
    hours: "6",
    hourly_rate_snapshot: "3200.00",
    computed_amount: "19200.00",
    final_amount: "19200.00",
    adjustment_reason: null,
    payroll_payment_id: null,
    ...overrides,
  };
}

describe("computeWorkLogAmount", () => {
  it("multiplies hours by the rate", () => {
    expect(computeWorkLogAmount("6", "3200.00")).toBe("19200.00");
  });

  it("handles fractional hours without floating-point drift", () => {
    expect(computeWorkLogAmount("7.5", "3200.00")).toBe("24000.00");
    expect(computeWorkLogAmount("0.1", "0.10")).toBe("0.01");
  });

  it("refuses nonsense input rather than producing a wrong amount", () => {
    expect(computeWorkLogAmount("abc", "3200.00")).toBe("0.00");
    expect(computeWorkLogAmount("-3", "3200.00")).toBe("0.00");
  });
});

describe("buildWorkLogPayload", () => {
  it("sends the computed amount when nothing was overridden", () => {
    expect(buildWorkLogPayload(input())).toEqual({
      user_id: "u-1",
      business_date: "2026-08-05",
      hours: "6",
      amount: "19200.00",
    });
  });

  it("requires a reason once the amount differs from the computed one", () => {
    expect(
      buildWorkLogPayload(input({ overrideAmount: "21000.00" })),
    ).toBeNull();
  });

  it("sends the reason with the overridden amount", () => {
    expect(
      buildWorkLogPayload(
        input({
          overrideAmount: "21000.00",
          adjustmentReason: "  Feriado, se paga doble  ",
        }),
      ),
    ).toEqual({
      user_id: "u-1",
      business_date: "2026-08-05",
      hours: "6",
      amount: "21000.00",
      adjustment_reason: "Feriado, se paga doble",
    });
  });

  it("does not demand a reason when the override equals the computed amount", () => {
    const payload = buildWorkLogPayload(input({ overrideAmount: "19200.00" }));

    expect(payload).not.toBeNull();
    expect(payload).not.toHaveProperty("adjustment_reason");
  });

  it("rejects zero, negative and missing hours", () => {
    expect(buildWorkLogPayload(input({ hours: "0" }))).toBeNull();
    expect(buildWorkLogPayload(input({ hours: "-2" }))).toBeNull();
    expect(buildWorkLogPayload(input({ hours: "" }))).toBeNull();
  });
});

describe("isAdjusted", () => {
  it("compares amounts through cents, not string equality", () => {
    expect(
      isAdjusted({ final_amount: "19200.0", computed_amount: "19200.00" }),
    ).toBe(false);
    expect(
      isAdjusted({ final_amount: "21000.00", computed_amount: "19200.00" }),
    ).toBe(true);
  });
});

describe("isSettled", () => {
  it("is false for an unpaid log, including when the backend omits the key entirely", () => {
    expect(isSettled({ payroll_payment_id: null })).toBe(false);
    // `payroll_payment_id` is an `omitempty` pointer on the backend: an
    // unpaid work log has no such key in the JSON at all, so at runtime the
    // value here is `undefined`, not `null` — a strict `=== null` check
    // would wrongly report this log as settled.
    expect(
      isSettled({
        payroll_payment_id: undefined as unknown as string | null,
      }),
    ).toBe(false);
  });

  it("is true once a payment id is present", () => {
    expect(isSettled({ payroll_payment_id: "pay-1" })).toBe(true);
  });
});

describe("canEditWorkLog", () => {
  it("allows editing an unpaid log and blocks a settled one", () => {
    expect(canEditWorkLog({ payroll_payment_id: null })).toBe(true);
    expect(canEditWorkLog({ payroll_payment_id: "pay-1" })).toBe(false);
  });
});

describe("payrollRowsFor", () => {
  const pending: PayrollPendingItem[] = [
    {
      user_id: "u-2",
      username: "juan",
      full_name: "Juan Pérez",
      hourly_rate: "2800.00",
      user_active: true,
      total_hours: "20",
      total_amount: "56000.00",
      pending_days: 3,
      oldest_unpaid_date: "2026-08-11",
    },
  ];

  it("lists an employee with a rate but no hours at zero instead of omitting them", () => {
    const rows = payrollRowsFor(
      [user(), user({ id: "u-2", username: "juan", first_name: "Juan" })],
      pending,
    );

    expect(rows.map((row) => row.user_id)).toEqual(["u-1", "u-2"]);
    expect(rows[0]).toMatchObject({ pending_days: 0, total_amount: "0.00" });
  });

  it("excludes users without an hourly rate", () => {
    expect(payrollRowsFor([user({ hourly_rate: null })], [])).toEqual([]);
  });

  it("keeps an inactive user who still has unsettled hours", () => {
    const rows = payrollRowsFor([user({ id: "u-2", active: false })], pending);

    expect(rows.map((row) => row.user_id)).toEqual(["u-2"]);
  });
});

describe("canRecordHoursFor", () => {
  it("needs an active user with a rate", () => {
    expect(canRecordHoursFor({ active: true, hourly_rate: "3200.00" })).toBe(
      true,
    );
    expect(canRecordHoursFor({ active: false, hourly_rate: "3200.00" })).toBe(
      false,
    );
    expect(canRecordHoursFor({ active: true, hourly_rate: null })).toBe(false);
  });
});

describe("canSettle", () => {
  it("is unavailable with nothing pending", () => {
    expect(canSettle({ pending_days: 0 })).toBe(false);
    expect(canSettle({ pending_days: 2 })).toBe(true);
  });
});

describe("settlementTotals", () => {
  it("sums days, hours and amounts and flags any adjustment", () => {
    expect(
      settlementTotals([
        log(),
        log({
          id: "wl-2",
          business_date: "2026-08-06",
          hours: "5",
          computed_amount: "16000.00",
          final_amount: "21000.00",
          adjustment_reason: "Feriado",
        }),
      ]),
    ).toEqual({
      days: 2,
      hours: 11,
      amount: "40200.00",
      hasAdjustment: true,
    });
  });
});
