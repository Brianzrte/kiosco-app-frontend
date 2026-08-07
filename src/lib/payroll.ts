import { fromCents, toCents } from "./money";
import { PayrollPendingItem, User, WorkLog } from "./types";

/**
 * Las horas llegan como string decimal. Se multiplican por la tarifa en centavos
 * enteros para no arrastrar error de punto flotante en el monto del sueldo.
 */
export function computeWorkLogAmount(
  hours: string,
  hourlyRate: string,
): string {
  const parsedHours = Number(hours);
  if (!Number.isFinite(parsedHours) || parsedHours < 0) return "0.00";
  return fromCents(Math.round(toCents(hourlyRate) * parsedHours));
}

export function isAdjusted(
  log: Pick<WorkLog, "final_amount" | "computed_amount">,
) {
  return toCents(log.final_amount) !== toCents(log.computed_amount);
}

/**
 * `payroll_payment_id` es un puntero `omitempty` en el backend: en una hora
 * sin liquidar, la clave está ausente (`undefined`), no `null`. Por eso la
 * comprobación es "truthy", no `!== null` — un `=== null` estricto marcaría
 * como liquidada cualquier hora recién cargada.
 */
export function isSettled(log: Pick<WorkLog, "payroll_payment_id">) {
  return Boolean(log.payroll_payment_id);
}

export type WorkLogFormInput = {
  userId: string;
  businessDate: string;
  hours: string;
  hourlyRate: string;
  overrideAmount: string;
  adjustmentReason: string;
};

/**
 * Devuelve `null` cuando falta algo obligatorio. El motivo es obligatorio en
 * cuanto el monto final difiere del calculado: sin él, el reporte por empleado
 * deja de ser auditable, que es lo único que sostiene un monto editable.
 */
export function buildWorkLogPayload(input: WorkLogFormInput) {
  if (!input.userId || !input.businessDate) return null;

  const hours = Number(input.hours);
  if (!Number.isFinite(hours) || hours <= 0) return null;

  const computed = computeWorkLogAmount(input.hours, input.hourlyRate);
  const amount = input.overrideAmount || computed;
  const adjusted = toCents(amount) !== toCents(computed);
  if (adjusted && !input.adjustmentReason.trim()) return null;

  return {
    user_id: input.userId,
    business_date: input.businessDate,
    hours: input.hours,
    amount,
    ...(adjusted ? { adjustment_reason: input.adjustmentReason.trim() } : {}),
  };
}

export function canEditWorkLog(log: Pick<WorkLog, "payroll_payment_id">) {
  return !isSettled(log);
}

export function canSettle(item: Pick<PayrollPendingItem, "pending_days">) {
  return item.pending_days > 0;
}

/**
 * Un empleado con tarifa pero sin horas en el período se lista en cero, no se
 * omite: que alguien no haya trabajado es información.
 */
export function payrollRowsFor(
  users: User[],
  pending: PayrollPendingItem[],
): PayrollPendingItem[] {
  const byUser = new Map(pending.map((item) => [item.user_id, item]));
  const rows = users
    .filter((user) => user.hourly_rate !== null && user.active)
    .map<PayrollPendingItem>(
      (user) =>
        byUser.get(user.id) ?? {
          user_id: user.id,
          username: user.username,
          full_name: `${user.first_name} ${user.last_name}`.trim(),
          hourly_rate: user.hourly_rate,
          user_active: user.active,
          total_hours: "0",
          total_amount: "0.00",
          pending_days: 0,
          oldest_unpaid_date: null,
        },
    );

  // Un usuario inactivo con horas sin liquidar sigue teniendo que cobrar.
  const listed = new Set(rows.map((row) => row.user_id));
  return rows.concat(pending.filter((item) => !listed.has(item.user_id)));
}

export function canRecordHoursFor(user: Pick<User, "active" | "hourly_rate">) {
  return user.active && user.hourly_rate !== null;
}

export function settlementTotals(logs: WorkLog[]) {
  return {
    days: logs.length,
    hours: logs.reduce((total, log) => total + Number(log.hours), 0),
    amount: fromCents(
      logs.reduce((total, log) => total + toCents(log.final_amount), 0),
    ),
    hasAdjustment: logs.some(isAdjusted),
  };
}
