import { toCents } from "./money";
import { todayISO } from "./salesSummary";
import {
  Expense,
  ExpensePaymentMethod,
  ExpenseStatus,
  ExpenseType,
} from "./types";

/**
 * `PAYROLL` no está acá a propósito: un sueldo nace sólo de la liquidación, y
 * dos caminos para el mismo hecho producen descuadres. Sigue siendo un valor
 * válido de `ExpenseType` porque se lista y se filtra.
 */
export const SELECTABLE_EXPENSE_TYPES: ExpenseType[] = [
  "OPERATING",
  "PURCHASE",
  "SELF_CONSUMPTION",
  "OWNER_DRAW",
];

export const EXPENSE_PAYMENT_METHODS: ExpensePaymentMethod[] = [
  "CASH_REGISTER",
  "OWNER_FUNDS",
  "TRANSFER",
  "CARD",
];

export function expenseTypeLabel(type: ExpenseType) {
  return type === "OPERATING"
    ? "Gasto operativo"
    : type === "PURCHASE"
      ? "Compra"
      : type === "PAYROLL"
        ? "Sueldo"
        : type === "SELF_CONSUMPTION"
          ? "Autoconsumo"
          : "Retiros personales";
}

export function paymentMethodLabel(method: ExpensePaymentMethod) {
  return method === "CASH_REGISTER"
    ? "Efectivo de caja"
    : method === "OWNER_FUNDS"
      ? "Plata propia"
      : method === "TRANSFER"
        ? "Transferencia"
        : "Tarjeta";
}

export function expenseStatusLabel(status: ExpenseStatus) {
  return status === "ACTIVE" ? "Activo" : "Anulado";
}

/** El medio de pago es el único eje que decide si el egreso toca el cajón. */
export function affectsCashRegister(method: ExpensePaymentMethod) {
  return method === "CASH_REGISTER";
}

/**
 * Si un egreso puntual efectivamente cuenta en algún arqueo, distinto de
 * `affectsCashRegister` (que sólo describe la regla general del medio de
 * pago). D2, resuelto en vivo el 2026-08-06: `CASH_REGISTER` se asocia al
 * turno activo sólo si había exactamente uno al crearse; si no, el egreso
 * queda sin `cash_shift_id` y no participa de ningún cierre, pasado o
 * presente. Un egreso `VOID` tampoco cuenta (D7/spec: "contribute zero to
 * every total").
 */
export function expenseCountsTowardClosing(
  expense: Pick<Expense, "payment_method" | "cash_shift_id" | "status">,
): boolean {
  return (
    expense.status === "ACTIVE" &&
    affectsCashRegister(expense.payment_method) &&
    Boolean(expense.cash_shift_id)
  );
}

export function requiresCategory(type: ExpenseType) {
  return type !== "OWNER_DRAW" && type !== "PAYROLL";
}

export function allowsLines(type: ExpenseType) {
  return type === "PURCHASE" || type === "SELF_CONSUMPTION";
}

export function requiresLines(type: ExpenseType) {
  return type === "SELF_CONSUMPTION";
}

export function allowsSupplier(type: ExpenseType) {
  return type === "PURCHASE";
}

/**
 * En autoconsumo el costo lo fija el catálogo: si se tipea, dos autoconsumos del
 * mismo producto pueden valorizarse distinto y el egreso deja de conciliar con
 * inventario. En una compra el precio pagado sí es dato de entrada.
 */
export function allowsEditableUnitCost(type: ExpenseType) {
  return type === "PURCHASE";
}

/** El monto lo calcula el backend cuando hay líneas; el cliente no lo inventa. */
export function isAmountReadOnly(type: ExpenseType) {
  return type === "SELF_CONSUMPTION";
}

export type ExpenseLineInput = {
  productId: string;
  quantity: string;
  unitCost: string;
};

export type ExpenseFormInput = {
  type: ExpenseType;
  businessDate: string;
  amount: string;
  paymentMethod: ExpensePaymentMethod;
  categoryId: string;
  description: string;
  supplierId: string;
  lines: ExpenseLineInput[];
};

/**
 * Qué se pierde al cambiar de tipo. Se usa para avisar antes de descartar, no
 * para descartar en silencio.
 */
export function discardedByTypeChange(from: ExpenseType, to: ExpenseType) {
  const discarded: ("lines" | "supplier" | "category")[] = [];
  if (allowsLines(from) && !allowsLines(to)) discarded.push("lines");
  if (allowsSupplier(from) && !allowsSupplier(to)) discarded.push("supplier");
  if (requiresCategory(from) && !requiresCategory(to))
    discarded.push("category");
  return discarded;
}

function cleanLines(lines: ExpenseLineInput[], editableCost: boolean) {
  return lines
    .filter((line) => line.productId && line.quantity)
    .map((line) =>
      editableCost
        ? {
            product_id: line.productId,
            quantity: line.quantity,
            unit_cost: line.unitCost,
          }
        : { product_id: line.productId, quantity: line.quantity },
    );
}

/**
 * Devuelve `null` cuando falta algo obligatorio: el formulario no envía y marca
 * el campo. Los montos y las cantidades viajan como string decimal sin pasar
 * nunca por `Number()`.
 */
export function buildExpensePayload(input: ExpenseFormInput) {
  if (!SELECTABLE_EXPENSE_TYPES.includes(input.type)) return null;
  if (!input.businessDate || !input.description.trim()) return null;
  if (requiresCategory(input.type) && !input.categoryId) return null;

  const lines = allowsLines(input.type)
    ? cleanLines(input.lines, allowsEditableUnitCost(input.type))
    : [];
  if (requiresLines(input.type) && lines.length === 0) return null;
  if (!isAmountReadOnly(input.type) && !input.amount) return null;

  return {
    type: input.type,
    business_date: input.businessDate,
    payment_method: input.paymentMethod,
    description: input.description.trim(),
    // El backend exige un `amount` parseable en el body incluso cuando lo
    // va a ignorar y recalcular a partir de `items` — verificado en vivo el
    // 2026-08-06 no sólo para `PURCHASE` con líneas (D9) sino también para
    // `SELF_CONSUMPTION`: un `POST` sin la clave `amount` responde `400`
    // *antes* de llegar a la valorización por costo. `"0"` es el placeholder
    // que el cliente nunca lee de vuelta (el backend siempre recalcula el
    // `amount` real a partir de los items y lo devuelve en la respuesta).
    amount: isAmountReadOnly(input.type) ? "0" : input.amount,
    ...(requiresCategory(input.type)
      ? { expense_category_id: input.categoryId }
      : {}),
    ...(allowsSupplier(input.type) && input.supplierId
      ? { supplier_id: input.supplierId }
      : {}),
    ...(lines.length > 0 ? { items: lines } : {}),
  };
}

export type ExpenseFilters = {
  from: string;
  to: string;
  type: ExpenseType | "";
  categoryId: string;
  paymentMethod: ExpensePaymentMethod | "";
  status: ExpenseStatus | "";
};

export function expenseFiltersToQuery(filters: ExpenseFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.type) params.set("type", filters.type);
  if (filters.categoryId) params.set("expense_category_id", filters.categoryId);
  if (filters.paymentMethod)
    params.set("payment_method", filters.paymentMethod);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(page));
  return params.toString();
}

export function hasActiveFilters(filters: ExpenseFilters) {
  return Boolean(
    filters.type ||
    filters.categoryId ||
    filters.paymentMethod ||
    filters.status,
  );
}

/** El aviso de anulación enuncia el efecto real del tipo, no un texto genérico. */
export function voidImpactMessage(type: ExpenseType) {
  if (type === "SELF_CONSUMPTION") {
    return "Esto va a devolver al stock los productos de este autoconsumo. No se puede deshacer.";
  }
  if (type === "PAYROLL") {
    return "Esto va a liberar los días de esta liquidación para volver a liquidarlos. No se puede deshacer.";
  }
  if (type === "PURCHASE") {
    return "Esto anula la compra. Si ya sumó stock, revisalo en Inventario. No se puede deshacer.";
  }
  if (type === "OWNER_DRAW") {
    return "Esto anula el retiro. No se puede deshacer.";
  }
  return "Esto anula el egreso. No se puede deshacer.";
}

export function canVoid(expense: Expense, dayIsSealed: boolean) {
  return expense.status === "ACTIVE" && !dayIsSealed;
}

/**
 * Rango por defecto del hub: el mes calendario en curso, en la zona horaria
 * del negocio (spec: "a date range defaulting to the current month").
 */
export function currentMonthRange(now = new Date()): {
  from: string;
  to: string;
} {
  const today = todayISO(now);
  const [year, month] = today.split("-");
  return { from: `${year}-${month}-01`, to: today };
}

export type SummaryEntry = { key: string; label: string; amount: string };

/**
 * Convierte un mapa `clave → monto` (forma real de `by_type`/`by_category`/
 * `by_payment_method`, ver `types.ts` → `ExpenseSummary`) en filas ordenadas
 * de mayor a menor monto, para las barras del hub (D13). No inventa datos:
 * sólo lo que el backend efectivamente envía.
 */
export function summaryEntries(
  map: Record<string, string> | undefined,
  labelFor: (key: string) => string,
): SummaryEntry[] {
  return Object.entries(map ?? {})
    .map(([key, amount]) => ({ key, label: labelFor(key), amount }))
    .sort((a, b) => toCents(b.amount) - toCents(a.amount));
}

/** Clave vacía = sin rubro (p. ej. un retiro, que D8 excluye de gasto). */
export function categoryBucketLabel(key: string): string {
  return key.trim() ? key : "Sin rubro";
}

/**
 * Como `summaryEntries`, pero garantiza que cada clave de `keys` aparezca —
 * con `"0.00"` si el backend no la trae— y conserva el orden de `keys` en
 * vez de ordenar por monto. Usado por las tarjetas de medio de pago del hub,
 * que siempre muestran los cuatro medios (D13: "un rubro sin monto sigue
 * siendo información").
 */
export function normalizedSummaryEntries(
  map: Record<string, string> | undefined,
  keys: string[],
  labelFor: (key: string) => string,
): SummaryEntry[] {
  return keys.map((key) => ({
    key,
    label: labelFor(key),
    amount: map?.[key] ?? "0.00",
  }));
}

/**
 * Ancho de barra proporcional al mayor monto del grupo (D13): decoración
 * pura, la cifra en texto es siempre la fuente real. `0` cuando no hay
 * ningún monto positivo en el grupo, para no dividir por cero.
 */
export function barPercent(amount: string, maxAmount: string): number {
  const maxCents = toCents(maxAmount);
  if (maxCents <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((toCents(amount) / maxCents) * 100)),
  );
}
