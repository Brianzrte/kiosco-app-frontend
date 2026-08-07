"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api";
import { EXPENSE_PAYMENT_METHODS, paymentMethodLabel } from "@/lib/expenses";
import { formatMoney } from "@/lib/money";
import {
  buildWorkLogPayload,
  canRecordHoursFor,
  canSettle,
  computeWorkLogAmount,
  payrollRowsFor,
} from "@/lib/payroll";
import {
  ExpensePaymentMethod,
  PayrollPendingItem,
  User,
  WorkLog,
} from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { ExpensesContextualActions } from "./ExpensesContextualActions";

/** Forma real de `GET /payroll/pending`, distinta del tipo `PayrollPendingItem` del frontend. */
type PayrollPendingApiItem = {
  user_id: string;
  user_name: string;
  total_hours: string;
  total_amount: string;
  unpaid_days: number;
  oldest_business_date: string | null;
};

const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 7)}-01`;

function PayrollLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando sueldos"
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="Sueldos"
        description="Cargá horas por empleado y liquidá lo pendiente del período."
        actions={<ExpensesContextualActions screen="payroll" />}
      />
      <Card className="space-y-4">
        <Skeleton className="h-5 w-52" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Card>
      <Card className="space-y-4">
        <Skeleton className="h-6 w-36" />
        <div className="grid gap-4 md:grid-cols-5">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Card>
      <Card className="space-y-4">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </Card>
    </div>
  );
}

/**
 * `/expenses/payroll` (D3/D4): carga de horas por empleado y liquidación del
 * período. La lista "Pendiente de liquidar" pasa por `payrollRowsFor` para
 * que un empleado con tarifa pero sin horas en el período quede listado en
 * cero en vez de ausente (4.6) — el `GET /payroll/pending` real sólo incluye
 * a quien tiene horas, así que sin ese paso los empleados en cero
 * desaparecían de la lista.
 */
export function PayrollView() {
  const router = useRouter();
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<ExpensePaymentMethod>("CASH_REGISTER");
  const [settling, setSettling] = useState<PayrollPendingItem | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settlePending, setSettlePending] = useState(false);

  const usersLoad = useLoad(
    useCallback(() => api<{ users: User[] }>("/users?limit=200&page=1"), []),
  );
  const users = useMemo(() => usersLoad.data?.users ?? [], [usersLoad.data]);

  const pendingLoad = useLoad(
    useCallback(async () => {
      const response = await api<{ items: PayrollPendingApiItem[] }>(
        `/payroll/pending?from=${from}&to=${to}`,
      );
      const knownUsers = usersLoad.data?.users ?? [];
      const usersById = new Map(knownUsers.map((user) => [user.id, user]));
      return response.items.map((item): PayrollPendingItem => {
        const user = usersById.get(item.user_id);
        return {
          user_id: item.user_id,
          username: user?.username ?? item.user_name,
          full_name: item.user_name,
          hourly_rate: user?.hourly_rate ?? null,
          user_active: user?.active ?? true,
          total_hours: item.total_hours,
          total_amount: item.total_amount,
          pending_days: item.unpaid_days,
          oldest_unpaid_date: item.oldest_business_date,
        };
      });
      // Depende de `usersLoad.data` para resolver nombre/tarifa/estado por
      // id; se recalcula cuando cualquiera de los dos termina de cargar.
    }, [from, to, usersLoad.data]),
  );

  const employees = useMemo(() => users.filter(canRecordHoursFor), [users]);
  const rows = useMemo(
    () => (pendingLoad.data ? payrollRowsFor(users, pendingLoad.data) : []),
    [users, pendingLoad.data],
  );
  const selectedUser = users.find((user) => user.id === selectedUserId);

  function chooseUser(userId: string) {
    setSelectedUserId(userId);
    const user = users.find((item) => item.id === userId);
    setAmount(
      user?.hourly_rate && hours
        ? computeWorkLogAmount(hours, user.hourly_rate)
        : "",
    );
  }

  function updateHours(value: string) {
    setHours(value);
    setAmount(
      selectedUser?.hourly_rate && value
        ? computeWorkLogAmount(value, selectedUser.hourly_rate)
        : "",
    );
  }

  async function saveHours(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const payload = buildWorkLogPayload({
      userId: selectedUserId,
      businessDate: date,
      hours,
      hourlyRate: selectedUser?.hourly_rate ?? "0",
      overrideAmount: amount,
      adjustmentReason: reason,
    });
    if (!payload) {
      setFormError(
        "Revisá las horas y el monto. Si el monto final no coincide con el calculado, contá el motivo del ajuste.",
      );
      return;
    }
    setSaving(true);
    try {
      await api<WorkLog>("/work-logs", { method: "POST", body: payload });
      setHours("");
      setAmount("");
      setReason("");
      pendingLoad.reload();
    } catch (e) {
      setFormError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmSettlement(item: PayrollPendingItem) {
    setSettleError(null);
    setSettlePending(true);
    try {
      await api("/payroll/payments", {
        method: "POST",
        body: {
          user_id: item.user_id,
          period_from: from,
          period_to: to,
          payment_method: paymentMethod,
        },
      });
      setSettling(null);
      pendingLoad.reload();
      router.refresh();
    } catch (e) {
      // El `409` de liquidación concurrente (u otro fallo) se muestra en el
      // propio diálogo, que se mantiene abierto para que el mensaje sea
      // visible; el pendiente se refresca igual porque puede haber cambiado.
      setSettleError((e as ApiError).message);
      pendingLoad.reload();
    } finally {
      setSettlePending(false);
    }
  }

  if (usersLoad.error) {
    return <ErrorState error={usersLoad.error} onRetry={usersLoad.reload} />;
  }
  if (pendingLoad.error) {
    return (
      <ErrorState error={pendingLoad.error} onRetry={pendingLoad.reload} />
    );
  }
  if (usersLoad.data === null || pendingLoad.data === null) {
    return <PayrollLoadingSkeleton />;
  }

  const noEligibleEmployees = employees.length === 0 && rows.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sueldos"
        description="Cargá horas por empleado y liquidá lo pendiente del período."
        actions={<ExpensesContextualActions screen="payroll" />}
      />

      {noEligibleEmployees ? (
        <EmptyState
          message="Ningún empleado tiene tarifa horaria configurada. Definila desde Usuarios para empezar a cargar y liquidar horas."
          action={
            <Button onClick={() => router.push("/users")}>Ir a Usuarios</Button>
          }
        />
      ) : (
        <>
          <Card>
            <h2 className="text-sm font-medium text-text-secondary">
              Período y medio de pago
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Input
                label="Desde"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <Input
                label="Hasta"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Medio de pago al liquidar
                <select
                  className="h-11 rounded-app border border-border bg-surface px-3 text-sm hover:border-border-hover focus:border-primary"
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as ExpensePaymentMethod)
                  }
                >
                  {EXPENSE_PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {paymentMethodLabel(method)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold">Cargar horas</h2>
            <form
              onSubmit={saveHours}
              className="mt-4 grid gap-4 md:grid-cols-5"
            >
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Empleado
                <select
                  required
                  className="h-11 rounded-app border border-border bg-surface px-3 text-sm hover:border-border-hover focus:border-primary"
                  value={selectedUserId}
                  onChange={(event) => chooseUser(event.target.value)}
                >
                  <option value="">Elegí un empleado</option>
                  {employees.map((user) => (
                    <option key={user.id} value={user.id}>
                      {`${user.first_name} ${user.last_name}`.trim() ||
                        user.username}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Fecha"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
              <Input
                label="Horas"
                type="number"
                min="0.01"
                step="0.01"
                value={hours}
                onChange={(event) => updateHours(event.target.value)}
                required
              />
              <div>
                <Input
                  label="Monto final"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  required
                />
                <p className="mt-1 text-xs text-text-secondary">
                  Se precarga con horas × tarifa; se puede pisar.
                </p>
              </div>
              <Input
                label="Motivo del ajuste"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Obligatorio sólo si cambiás el monto"
              />
              <div className="md:col-span-5">
                <Button
                  type="submit"
                  pending={saving}
                  disabled={!selectedUserId}
                >
                  {saving ? "Guardando…" : "Cargar horas"}
                </Button>
              </div>
            </form>
            {formError && (
              <p role="alert" className="mt-3 text-sm text-error">
                {formError}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-semibold">Pendiente de liquidar</h2>
            {pendingLoad.data === null ? (
              <ListSkeleton rows={3} />
            ) : rows.length === 0 ? (
              <p className="mt-4 text-sm text-text-secondary">
                Ningún empleado con tarifa horaria tiene horas cargadas en este
                período.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {rows.map((row) => {
                  const settleable = canSettle(row);
                  return (
                    <div
                      key={row.user_id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0"
                    >
                      <div>
                        <p className="font-medium">
                          <Link
                            href={`/expenses/payroll/${row.user_id}`}
                            className="text-primary hover:text-primary-hover hover:underline"
                          >
                            {row.full_name || row.username}
                          </Link>
                          {!row.user_active && (
                            <span className="ml-2 text-xs font-normal text-text-secondary">
                              (usuario inactivo)
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {row.total_hours} h · {formatMoney(row.total_amount)}{" "}
                          · {row.pending_days} día
                          {row.pending_days === 1 ? "" : "s"} pendiente
                          {row.pending_days === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setSettleError(null);
                          setSettling(row);
                        }}
                        disabled={!settleable}
                      >
                        {settleable ? "Liquidar" : "Sin pendiente"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      <Dialog
        open={settling !== null}
        title="Confirmar liquidación"
        onClose={() => (settlePending ? null : setSettling(null))}
        dismissible={!settlePending}
      >
        {settling && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              Vas a liquidar a{" "}
              <strong className="font-semibold text-text-primary">
                {settling.full_name || settling.username}
              </strong>{" "}
              el período del {from} al {to}.
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-text-secondary">Horas</dt>
                <dd className="font-semibold">{settling.total_hours}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Monto</dt>
                <dd className="font-semibold">
                  {formatMoney(settling.total_amount)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-text-secondary">Medio de pago</dt>
                <dd className="font-semibold">
                  {paymentMethodLabel(paymentMethod)}
                </dd>
              </div>
            </dl>
            {settleError && (
              <p role="alert" className="text-sm text-error">
                {settleError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setSettling(null)}
                disabled={settlePending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => confirmSettlement(settling)}
                pending={settlePending}
              >
                {settlePending ? "Liquidando…" : "Confirmar liquidación"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
