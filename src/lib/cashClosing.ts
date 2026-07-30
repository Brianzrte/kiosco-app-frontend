import { fromCents, toCents } from "./money";
import { CashClosingReconciliationStatus } from "./types";

export const CASH_CLOSING_STATUS_CHANGED = "cash-closing-status-changed";

export type ReconciliationStatusTone =
  | "success"
  | "warning"
  | "error"
  | "neutral";

type ReconciliationStatusPresentation = {
  label: string;
  tone: ReconciliationStatusTone;
};

const reconciliationStatusPresentation: Record<
  CashClosingReconciliationStatus,
  ReconciliationStatusPresentation
> = {
  NO_ACTIVITY: { label: "Sin actividad", tone: "neutral" },
  IN_PROGRESS: { label: "Caja en curso", tone: "warning" },
  UNCLOSED: { label: "Sin cerrar", tone: "error" },
  CLOSED: { label: "Cierre registrado", tone: "success" },
  REQUIRES_UPDATE: { label: "Pendiente de actualizar", tone: "warning" },
};

/** Presentation-only mapping for backend-owned reconciliation statuses. */
export function reconciliationStatusLabel(
  status: CashClosingReconciliationStatus,
): string {
  return reconciliationStatusPresentation[status].label;
}

/** Presentation-only tone; status meaning remains fully backend-owned. */
export function reconciliationStatusTone(
  status: CashClosingReconciliationStatus,
): ReconciliationStatusTone {
  return reconciliationStatusPresentation[status].tone;
}

/** The same decimal-string contract the backend accepts for counted cash. */
export function isCountedCash(value: string): boolean {
  return /^\d+(?:\.\d{1,2})?$/.test(value);
}

/** Returns counted minus expected using integer cents, never floating point. */
export function cashDifference(
  expectedCash: string,
  countedCash: string,
): string | null {
  if (!isCountedCash(countedCash)) return null;
  return fromCents(toCents(countedCash) - toCents(expectedCash));
}
