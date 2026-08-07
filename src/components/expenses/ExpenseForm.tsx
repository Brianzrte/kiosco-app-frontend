"use client";

import { FormEvent, KeyboardEvent, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { ExpensesContextualActions } from "@/components/expenses/ExpensesContextualActions";
import {
  ExpenseDraftLine,
  ExpenseLineRow,
} from "@/components/expenses/ExpenseLineRow";
import { api, ApiError } from "@/lib/api";
import {
  allowsEditableUnitCost,
  allowsLines,
  allowsSupplier,
  buildExpensePayload,
  discardedByTypeChange,
  EXPENSE_PAYMENT_METHODS,
  expenseTypeLabel,
  paymentMethodLabel,
  requiresCategory,
  requiresLines,
  SELECTABLE_EXPENSE_TYPES,
} from "@/lib/expenses";
import { isValidPurchaseQuantity } from "@/lib/purchasing";
import { todayISO } from "@/lib/salesSummary";
import {
  Expense,
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseType,
  Product,
  Supplier,
} from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

let lineIdCounter = 0;
function nextLineId(): string {
  lineIdCounter += 1;
  return `line-${lineIdCounter}`;
}

function emptyLine(): ExpenseDraftLine {
  return { id: nextLineId(), productId: "", quantity: "", unitCost: "" };
}

const PAYMENT_METHOD_TONE: Record<ExpensePaymentMethod, string> = {
  CASH_REGISTER:
    "border-payment-cash bg-payment-cash/40 data-[active=true]:bg-payment-cash data-[active=true]:border-payment-cash",
  OWNER_FUNDS:
    "border-border bg-surface-2 data-[active=true]:bg-surface-2 data-[active=true]:border-border-strong",
  TRANSFER:
    "border-payment-transfer bg-payment-transfer/40 data-[active=true]:bg-payment-transfer data-[active=true]:border-payment-transfer",
  CARD: "border-payment-card bg-payment-card/40 data-[active=true]:bg-payment-card data-[active=true]:border-payment-card",
};

type FieldErrors = Partial<
  Record<
    "businessDate" | "amount" | "categoryId" | "description" | "lines",
    string
  >
>;

function ExpenseFormSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando formulario de egreso"
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="Registrar egreso"
        actions={<ExpensesContextualActions screen="new" />}
      />
      <Card className="max-w-3xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-44" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-11 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
        </div>
        <div className="flex justify-end border-t border-border pt-4">
          <Skeleton className="h-11 w-40" />
        </div>
      </Card>
    </div>
  );
}

export function ExpenseForm() {
  const router = useRouter();
  const [type, setType] = useState<ExpenseType>("OPERATING");
  const [businessDate, setBusinessDate] = useState(() => todayISO());
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<ExpensePaymentMethod>("CASH_REGISTER");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<ExpenseDraftLine[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingType, setPendingType] = useState<ExpenseType | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const addLineButtonRef = useRef<HTMLButtonElement>(null);
  const lineRemoveButtonRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );

  const fetcher = useCallback(
    () =>
      Promise.all([
        api<{ items: ExpenseCategory[] }>(
          "/expense-categories?include_inactive=true",
        ).then((r) => r.items),
        api<{ products: Product[] }>("/products?limit=200").then(
          (r) => r.products,
        ),
        api<{ suppliers: Supplier[] }>("/suppliers").then((r) => r.suppliers),
      ]),
    [],
  );
  const { data, error } = useLoad(fetcher);

  function applyTypeChange(nextType: ExpenseType) {
    const discarded = discardedByTypeChange(type, nextType);
    setType(nextType);
    if (discarded.includes("lines")) setLines([]);
    if (discarded.includes("supplier")) setSupplierId("");
    if (discarded.includes("category")) setCategoryId("");
    setFieldErrors({});
    setLineErrors({});
    setPendingType(null);

    const added: string[] = [];
    if (allowsSupplier(nextType) && !allowsSupplier(type))
      added.push("proveedor");
    if (allowsLines(nextType) && !allowsLines(type))
      added.push("líneas de producto");
    const removed: string[] = [];
    if (discarded.includes("supplier")) removed.push("proveedor");
    if (discarded.includes("lines")) removed.push("líneas de producto");
    if (discarded.includes("category")) removed.push("rubro");
    const parts = [`Tipo cambiado a ${expenseTypeLabel(nextType)}.`];
    if (added.length) parts.push(`Se agregó ${added.join(" y ")}.`);
    if (removed.length) parts.push(`Se quitó ${removed.join(", ")}.`);
    setAnnouncement(parts.join(" "));

    // `Select` (Input.tsx) no reenvía ref, así que sólo el foco hacia el
    // botón de agregar línea (un `Button`, que sí reenvía ref) se mueve acá.
    // El campo de proveedor que agrega `Compra` queda alcanzable por
    // teclado en el orden visual normal, sin el salto automático de foco.
    if (nextType === "SELF_CONSUMPTION") {
      requestAnimationFrame(() => addLineButtonRef.current?.focus());
    }
  }

  function attemptTypeChange(nextType: ExpenseType) {
    if (nextType === type) return;
    const discarded = discardedByTypeChange(type, nextType);
    const linesHaveData = lines.some(
      (line) => line.productId || line.quantity || line.unitCost,
    );
    const hasDiscardableData =
      (discarded.includes("lines") && linesHaveData) ||
      (discarded.includes("supplier") && supplierId.trim() !== "") ||
      (discarded.includes("category") && categoryId !== "");
    if (hasDiscardableData) {
      setPendingType(nextType);
      return;
    }
    applyTypeChange(nextType);
  }

  function onTypeKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = SELECTABLE_EXPENSE_TYPES.indexOf(type);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (currentIndex + delta + SELECTABLE_EXPENSE_TYPES.length) %
      SELECTABLE_EXPENSE_TYPES.length;
    attemptTypeChange(SELECTABLE_EXPENSE_TYPES[nextIndex]);
  }

  function updateLine(
    id: string,
    field: "productId" | "quantity" | "unitCost",
    value: string,
  ) {
    setLines((current) =>
      current.map((line) =>
        line.id === id ? { ...line, [field]: value } : line,
      ),
    );
    setLineErrors((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function addLine() {
    const line = emptyLine();
    setLines((current) => [...current, line]);
  }

  function removeLine(id: string) {
    const index = lines.findIndex((line) => line.id === id);
    const nextLine = lines[index + 1];
    setLines((current) => current.filter((line) => line.id !== id));
    setLineErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    requestAnimationFrame(() => {
      if (nextLine) lineRemoveButtonRefs.current[nextLine.id]?.focus();
      else addLineButtonRef.current?.focus();
    });
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!businessDate) errors.businessDate = "Ingresá la fecha.";
    if (type !== "SELF_CONSUMPTION" && !amount.trim()) {
      errors.amount = "Ingresá el monto.";
    }
    if (!description.trim()) errors.description = "Ingresá una descripción.";
    if (requiresCategory(type) && !categoryId) {
      errors.categoryId = "Elegí un rubro.";
    }
    if (requiresLines(type)) {
      const validLines = lines.filter(
        (line) => line.productId && isValidPurchaseQuantity(line.quantity),
      );
      if (validLines.length === 0) {
        errors.lines = "Agregá al menos un producto.";
      }
    }
    return errors;
  }

  function validateLines(): Record<string, string> {
    if (!allowsLines(type)) return {};
    const errors: Record<string, string> = {};
    for (const line of lines) {
      if (!line.productId) continue;
      if (!isValidPurchaseQuantity(line.quantity)) {
        errors[line.id] = "Ingresá una cantidad válida mayor a cero.";
        continue;
      }
      if (allowsEditableUnitCost(type) && !line.unitCost.trim()) {
        errors[line.id] = "Ingresá el costo unitario.";
      }
    }
    return errors;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const errors = validate();
    const perLineErrors = validateLines();
    setFieldErrors(errors);
    setLineErrors(perLineErrors);
    if (Object.keys(errors).length > 0) {
      setFormError(null);
      return;
    }
    if (Object.keys(perLineErrors).length > 0) {
      setFormError(null);
      return;
    }
    if (requiresLines(type) && lines.filter((l) => l.productId).length === 0) {
      setFieldErrors({ lines: "Agregá al menos un producto." });
      requestAnimationFrame(() => addLineButtonRef.current?.focus());
      return;
    }
    const payload = buildExpensePayload({
      type,
      businessDate,
      amount,
      paymentMethod,
      categoryId,
      description,
      supplierId: allowsSupplier(type) ? supplierId : "",
      lines: allowsLines(type) ? lines : [],
    });
    if (!payload) {
      setFormError("Revisá los datos del formulario.");
      return;
    }
    setFormError(null);
    setPending(true);
    try {
      const created = await api<Expense>("/expenses", {
        method: "POST",
        body: payload,
      });
      router.push(`/expenses/${created.id}`);
      router.refresh();
    } catch (cause) {
      const apiError = cause as ApiError;
      // El backend no identifica el producto en un 422 de stock insuficiente
      // (verificado en vivo el 2026-08-06: el body es siempre
      // `{"message":"No se puede completar esta acción con la información
      // actual."}`, sin campo de producto, contradiciendo la promesa del
      // spec de "identifying that product"). Cuando hay una sola línea con
      // producto no hay ambigüedad posible y se ata a esa línea con
      // `aria-describedby`; con más de una línea no se inventa a cuál
      // corresponde, y el error queda a nivel de la sección de líneas.
      const linesWithProduct = lines.filter((l) => l.productId);
      if (
        apiError.status === 422 &&
        allowsLines(type) &&
        linesWithProduct.length === 1
      ) {
        setLineErrors({ [linesWithProduct[0].id]: apiError.message });
      } else {
        setFormError(apiError.message);
      }
    } finally {
      setPending(false);
    }
  }

  if (error) return <ErrorState error={error} />;
  if (!data) return <ExpenseFormSkeleton />;

  const [categories, products, suppliers] = data;
  const activeCategories = categories.filter((c) => c.active);
  const activeSuppliers = suppliers.filter((s) => s.active);
  const affectsCash = paymentMethod === "CASH_REGISTER";
  const linesRequired = requiresLines(type);
  const linesEnabled = allowsLines(type);
  const editableCost = allowsEditableUnitCost(type);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registrar egreso"
        actions={<ExpensesContextualActions screen="new" />}
      />
      <Card className="max-w-3xl">
        <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
          <div>
            <p className="text-sm font-semibold text-text-primary">Tipo</p>
            <p className="mb-2 text-xs text-text-secondary">
              Qué hace el sistema con esto
            </p>
            <div
              role="radiogroup"
              aria-label="Tipo de egreso"
              className="flex flex-wrap gap-2"
            >
              {SELECTABLE_EXPENSE_TYPES.map((option) => {
                const active = option === type;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={active ? 0 : -1}
                    onKeyDown={onTypeKeyDown}
                    onClick={() => attemptTypeChange(option)}
                    className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
                      active
                        ? "border-primary bg-primary-light text-primary"
                        : "border-border bg-surface text-text-secondary hover:border-border-hover"
                    }`}
                  >
                    {expenseTypeLabel(option)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              Los sueldos no se cargan acá — se generan al liquidar en Sueldos.
            </p>
            <div aria-live="polite" className="sr-only">
              {announcement}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Fecha"
              type="date"
              compact
              value={businessDate}
              onChange={(e) => setBusinessDate(e.target.value)}
              error={fieldErrors.businessDate}
            />
            <Input
              label="Monto"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={type === "SELF_CONSUMPTION"}
              error={fieldErrors.amount}
              placeholder="0.00"
            />
            {type === "SELF_CONSUMPTION" && (
              <p className="-mt-2 text-xs text-text-secondary md:col-start-2">
                Se calcula solo, valorizado al costo de cada producto.
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-text-primary">
              Medio de pago
            </p>
            <p className="mb-2 text-xs text-text-secondary">
              De dónde salió la plata
            </p>
            <div
              role="radiogroup"
              aria-label="Medio de pago"
              className="flex flex-wrap gap-2"
            >
              {EXPENSE_PAYMENT_METHODS.map((method) => {
                const active = method === paymentMethod;
                return (
                  <button
                    key={method}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-active={active}
                    onClick={() => setPaymentMethod(method)}
                    className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold text-text-primary transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${PAYMENT_METHOD_TONE[method]}`}
                  >
                    {paymentMethodLabel(method)}
                  </button>
                );
              })}
            </div>
            {affectsCash && (
              <p className="mt-2 text-sm font-semibold text-(--color-warning-strong)">
                Esto resta del cierre de caja de hoy.
              </p>
            )}
          </div>

          {requiresCategory(type) && (
            <div>
              <Select
                label="Rubro"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                error={fieldErrors.categoryId}
              >
                <option value="">Elegí un rubro</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-xs text-text-secondary">
                En qué gastaste. Se administra en Rubros.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="expense-description"
              className="mb-1.5 block text-sm font-medium"
            >
              Descripción
            </label>
            <textarea
              id="expense-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: nafta para el auto de reparto"
              rows={3}
              className="w-full rounded-app border border-border bg-surface px-3 py-2 text-sm shadow-soft hover:border-border-hover focus:border-primary"
              aria-describedby={
                fieldErrors.description
                  ? "expense-description-error"
                  : undefined
              }
            />
            {fieldErrors.description && (
              <p
                id="expense-description-error"
                role="alert"
                className="mt-1.5 text-sm text-error"
              >
                {fieldErrors.description}
              </p>
            )}
          </div>

          {allowsSupplier(type) && (
            <div>
              {/* El mockup (`design/15-registrar-compra-*`) dibuja este campo
                  como texto libre ("Ej: Distribuidora Sur"). No se implementa
                  así: el contrato exige un `supplier_id` real —un valor
                  inventado respondería `404` (spec de expenses, Requirement
                  "Create Expense")—, así que se resuelve como selector de
                  proveedores existentes, igual que en el pedido de compra.
                  Contradicción de mockup vs. contrato no cubierta por D5;
                  reportada para su reconciliación en design.md. */}
              <Select
                label="Proveedor (opcional)"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Sin proveedor</option>
                {activeSuppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {linesEnabled && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-text-primary">
                Líneas de producto{" "}
                {linesRequired ? "(obligatorio)" : "(opcional)"}
              </p>
              {lines.map((line) => (
                <ExpenseLineRow
                  key={line.id}
                  line={line}
                  products={products}
                  editableCost={editableCost}
                  disabledRemove={false}
                  error={lineErrors[line.id]}
                  onUpdate={(field, value) => updateLine(line.id, field, value)}
                  onRemove={() => removeLine(line.id)}
                  removeButtonRef={(el) => {
                    if (el) lineRemoveButtonRefs.current[line.id] = el;
                    else delete lineRemoveButtonRefs.current[line.id];
                  }}
                />
              ))}
              <Button
                ref={addLineButtonRef}
                type="button"
                variant="secondary"
                onClick={addLine}
                className="self-start"
                aria-describedby={
                  fieldErrors.lines ? "expense-lines-error" : undefined
                }
              >
                + Agregar línea de producto
              </Button>
              {fieldErrors.lines && (
                <p
                  id="expense-lines-error"
                  role="alert"
                  className="text-sm text-error"
                >
                  {fieldErrors.lines}
                </p>
              )}
            </div>
          )}

          {formError && (
            <p role="alert" className="text-sm text-error">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/expenses")}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" pending={pending} disabled={pending}>
              {pending ? "Registrando…" : "Registrar egreso"}
            </Button>
          </div>
        </form>
      </Card>

      <Dialog
        open={pendingType !== null}
        title="¿Cambiar el tipo de egreso?"
        onClose={() => setPendingType(null)}
        dismissible={true}
      >
        <p className="mb-6 text-sm text-text-secondary">
          {pendingType &&
            `Cambiar a "${expenseTypeLabel(pendingType)}" va a descartar ${discardedByTypeChange(
              type,
              pendingType,
            )
              .map((field) =>
                field === "lines"
                  ? "las líneas de producto cargadas"
                  : field === "supplier"
                    ? "el proveedor elegido"
                    : "el rubro elegido",
              )
              .join(" y ")}. Los demás datos cargados se conservan.`}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setPendingType(null)}>
            Volver
          </Button>
          <Button
            variant="danger"
            onClick={() => pendingType && applyTypeChange(pendingType)}
          >
            Sí, cambiar
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
