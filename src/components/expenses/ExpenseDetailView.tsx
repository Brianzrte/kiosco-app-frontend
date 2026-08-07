"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { performedByLabel } from "@/components/returns/ReturnHistory";
import { Badge, Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import {
  canVoid,
  expenseCountsTowardClosing,
  expenseStatusLabel,
  expenseTypeLabel,
  paymentMethodLabel,
  voidImpactMessage,
} from "@/lib/expenses";
import { formatMoney } from "@/lib/money";
import { quantityUnit } from "@/lib/purchasing";
import {
  Expense,
  ExpenseCategory,
  ExpensePaymentMethod,
  Product,
  Supplier,
  User,
} from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

const PAYMENT_METHOD_BADGE_TONE: Record<ExpensePaymentMethod, Tone> = {
  CASH_REGISTER: "payment-cash",
  OWNER_FUNDS: "neutral",
  TRANSFER: "payment-transfer",
  CARD: "payment-card",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * `/expenses/[id]` — pantalla de profundidad (D11): no muestra la subnav,
 * sólo la barra de volver. Anulación con confirmación explícita que enuncia
 * el efecto por tipo (D14) y trata el `409` de día sellado como autoritativo
 * (D7): el frontend no intenta adivinar de antemano si el día está sellado
 * —no hay un mapeo verificado en vivo de egreso a estado de cierre—, pero en
 * cuanto el backend lo informa, deshabilita la acción y muestra el motivo.
 */
export function ExpenseDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidPending, setVoidPending] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);
  const [sealedBlocked, setSealedBlocked] = useState(false);

  const fetcher = useCallback(
    () =>
      Promise.all([
        api<Expense>(`/expenses/${id}`),
        api<{ items: ExpenseCategory[] }>(
          "/expense-categories?include_inactive=true",
        ).then((r) => r.items),
        api<{ suppliers: Supplier[] }>("/suppliers").then((r) => r.suppliers),
        api<{ products: Product[] }>("/products?limit=200").then(
          (r) => r.products,
        ),
        api<{ users: User[] }>("/users?limit=200").then((r) => r.users),
      ]),
    [id],
  );
  const { data, error, reload } = useLoad(fetcher);

  async function confirmVoid(expense: Expense) {
    if (!voidReason.trim()) {
      setVoidError("Ingresá un motivo.");
      return;
    }
    setVoidPending(true);
    setVoidError(null);
    try {
      await api(`/expenses/${expense.id}/void`, {
        method: "POST",
        body: { void_reason: voidReason.trim() },
      });
      setVoidOpen(false);
      setVoidReason("");
      reload();
    } catch (cause) {
      const apiError = cause as ApiError;
      if (apiError.status === 409) {
        setSealedBlocked(true);
        setVoidOpen(false);
      }
      setVoidError(apiError.message);
    } finally {
      setVoidPending(false);
    }
  }

  if (error?.status === 404) {
    return (
      <ErrorState
        error={new ApiError(404, "El egreso no existe.", "message")}
        onRetry={() => router.push("/expenses")}
      />
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <LoadingState />;

  const [expense, categories, suppliers, products, users] = data;
  const usersById = new Map(users.map((u) => [u.id, u.username]));
  const category = categories.find((c) => c.id === expense.expense_category_id);
  const supplier = suppliers.find((s) => s.id === expense.supplier_id);
  const countsTowardClosing = expenseCountsTowardClosing(expense);
  const voidAllowed = canVoid(expense, sealedBlocked);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/expenses"
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          ← Volver al hub de egresos
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-text-secondary">
            {formatDate(expense.business_date)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            {expenseTypeLabel(expense.type)}
            {category ? ` · ${category.name}` : ""}
          </h1>
        </div>
        <Badge tone={expense.status === "ACTIVE" ? "success" : "neutral"}>
          {expenseStatusLabel(expense.status)}
        </Badge>
      </div>

      <Card className="max-w-2xl">
        <dl className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-text-secondary">Monto</dt>
            <dd
              className={`num text-lg font-semibold ${
                expense.status === "VOID"
                  ? "text-text-disabled line-through"
                  : "text-text-primary"
              }`}
            >
              {formatMoney(expense.amount)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-text-secondary">Medio de pago</dt>
            <dd>
              <Badge tone={PAYMENT_METHOD_BADGE_TONE[expense.payment_method]}>
                {paymentMethodLabel(expense.payment_method)}
              </Badge>
            </dd>
          </div>
          {countsTowardClosing && (
            <p className="text-sm font-semibold text-(--color-warning-strong)">
              Este egreso salió del cajón y resta del cierre de caja de ese
              día.
            </p>
          )}
          {expense.payment_method === "CASH_REGISTER" &&
            !countsTowardClosing &&
            expense.status === "ACTIVE" && (
              <p className="text-sm text-text-secondary">
                Este egreso es en efectivo pero no quedó asociado a ningún
                turno de caja: no afecta ningún arqueo, ni el actual ni uno
                pasado.
              </p>
            )}
          {category && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-sm text-text-secondary">Rubro</dt>
              <dd className="text-sm text-text-primary">
                {category.name}
                {!category.active ? " (archivado)" : ""}
              </dd>
            </div>
          )}
          {expense.supplier_id && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-sm text-text-secondary">Proveedor</dt>
              <dd className="text-sm text-text-primary">
                {supplier?.name ?? "—"}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-text-secondary">Descripción</dt>
            <dd className="mt-1 text-sm text-text-primary">
              {expense.description}
            </dd>
          </div>
          {expense.items && expense.items.length > 0 && (
            <div>
              <dt className="mb-2 text-sm text-text-secondary">
                Líneas de producto
              </dt>
              <ul className="flex flex-col gap-2">
                {expense.items.map((item) => {
                  const product = products.find(
                    (p) => p.id === item.product_id,
                  );
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-app border border-border bg-surface-subtle px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        {product?.name ?? `Producto ${item.product_id.slice(0, 8)}`}
                        {" · "}
                        {item.quantity} {quantityUnit(product)}
                      </span>
                      <span className="num shrink-0 font-medium">
                        {formatMoney(item.subtotal)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-text-secondary">
            <span>Creado por {performedByLabel(expense.created_by, usersById)}</span>
            <span>{formatDateTime(expense.created_at)}</span>
          </div>
        </dl>
      </Card>

      {expense.status === "VOID" ? (
        <Card className="max-w-2xl border-error/30 bg-error/6">
          <p className="text-sm font-semibold text-error">Anulado</p>
          <p className="mt-1 text-sm text-text-primary">
            Motivo: {expense.void_reason}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Por{" "}
            {expense.voided_by
              ? performedByLabel(expense.voided_by, usersById)
              : "—"}{" "}
            el {expense.voided_at ? formatDateTime(expense.voided_at) : "—"}
          </p>
        </Card>
      ) : (
        <div className="max-w-2xl">
          <Button
            variant="danger"
            disabled={!voidAllowed}
            onClick={() => setVoidOpen(true)}
          >
            Anular egreso
          </Button>
          {sealedBlocked && (
            <p className="mt-2 text-sm text-text-secondary">
              No se puede anular: el cierre de caja del{" "}
              {formatDate(expense.business_date)} ya está sellado.
            </p>
          )}
        </div>
      )}

      <Dialog
        open={voidOpen}
        title="¿Anular este egreso?"
        onClose={() => (voidPending ? null : setVoidOpen(false))}
        dismissible={!voidPending}
      >
        <p className="mb-4 text-sm text-text-secondary">
          {voidImpactMessage(expense.type)}
        </p>
        <label htmlFor="void-reason" className="mb-1.5 block text-sm font-medium">
          Motivo
        </label>
        <textarea
          id="void-reason"
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          rows={2}
          disabled={voidPending}
          className="w-full rounded-app border border-border bg-surface px-3 py-2 text-sm shadow-soft hover:border-border-hover focus:border-primary"
        />
        {voidError && (
          <p role="alert" className="mt-2 text-sm text-error">
            {voidError}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setVoidOpen(false)}
            disabled={voidPending}
          >
            Volver
          </Button>
          <Button
            variant="danger"
            onClick={() => confirmVoid(expense)}
            pending={voidPending}
          >
            {voidPending ? "Anulando…" : "Sí, anular"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
