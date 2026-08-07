"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, ListSkeleton } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api";
import { paymentMethodLabel } from "@/lib/expenses";
import { formatMoney } from "@/lib/money";
import {
  buildWorkLogPayload,
  canEditWorkLog,
  isAdjusted,
  isSettled,
} from "@/lib/payroll";
import { PayrollPayment, User, WorkLog } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

type WorkLogList = { items: WorkLog[]; total: number };
type PaymentList = { items: PayrollPayment[]; total: number };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );
}

const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 7)}-01`;

/**
 * `/expenses/payroll/[userId]` (D3/D4): historial de horas y liquidaciones
 * de un empleado, accesible aunque el usuario esté desactivado — no filtra
 * por `active` en ningún fetch, sólo lo indica en la copy (4.8).
 *
 * Edición y borrado de horas (4.5): una hora ya liquidada
 * (`isSettled`/`payroll_payment_id` presente) nunca ofrece Editar/Borrar —
 * los botones se deshabilitan de antemano usando el estado `paid` del log,
 * no sólo el `409`. El `409` del backend (por ejemplo, si se liquidó en otra
 * pestaña mientras esta estaba abierta) igual se trata como autoritativo:
 * si llega, se muestra tal cual y se refresca la lista.
 */
export function PayrollEmployeeView({ userId }: { userId: string }) {
  const router = useRouter();
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [deleting, setDeleting] = useState<WorkLog | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const editHoursRef = useRef<HTMLInputElement>(null);
  const editButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [restoreFocusId, setRestoreFocusId] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    const [user, logs, payments, logsEver, paymentsEver] = await Promise.all([
      api<User>(`/users/${userId}`),
      api<WorkLogList>(
        `/work-logs?user_id=${userId}&from=${from}&to=${to}&limit=200&page=1`,
      ),
      api<PaymentList>(
        `/payroll/payments?user_id=${userId}&from=${from}&to=${to}&limit=200&page=1`,
      ),
      // Chequeo liviano (limit=1) para saber si el empleado tuvo alguna vez
      // horas/liquidaciones, sin filtrar por período — distingue "nunca cargó
      // horas" (4.8) de "sin actividad en este período" para no confundir un
      // período vacío con que el empleado nunca tuvo movimiento.
      api<WorkLogList>(`/work-logs?user_id=${userId}&limit=1&page=1`),
      api<PaymentList>(`/payroll/payments?user_id=${userId}&limit=1&page=1`),
    ]);
    return {
      user,
      logs: logs.items,
      payments: payments.items,
      everHadActivity: logsEver.total > 0 || paymentsEver.total > 0,
    };
  }, [userId, from, to]);
  const { data, error, reload } = useLoad(fetcher);

  // Mueve el foco al campo "Horas" al entrar en edición, igual que
  // `ExpenseCategoriesView.tsx`.
  useEffect(() => {
    if (!editingId) return;
    const frame = requestAnimationFrame(() => {
      editHoursRef.current?.focus();
      editHoursRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [editingId]);

  // Devuelve el foco al botón "Editar" que abrió la edición cuando esta se
  // cierra (cancelada o guardada con éxito). Al guardar, `saveEdit` llama
  // `reload()` en el mismo ciclo que `setEditingId(null)`: `useLoad` pone
  // `data` en `null` de forma síncrona, así que la lista salta al skeleton
  // en esa misma pasada y la fila (con su ref del botón) se desmonta antes
  // de que este efecto pueda enfocarla. Por eso el intento de foco espera a
  // que `data` vuelva a estar disponible (no `null`): recién ahí la lista
  // real, con la fila montada de nuevo, existe en el DOM.
  useEffect(() => {
    if (editingId !== null || !restoreFocusId || data === null) return;
    const idToFocus = restoreFocusId;
    const frame = requestAnimationFrame(() => {
      editButtonRefs.current.get(idToFocus)?.focus();
      setRestoreFocusId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [editingId, restoreFocusId, data]);

  function startEdit(log: WorkLog) {
    setEditingId(log.id);
    setEditHours(log.hours);
    setEditAmount(log.final_amount);
    setEditReason(log.adjustment_reason ?? "");
    setEditError(null);
  }

  function cancelEdit() {
    if (editPending) return;
    setRestoreFocusId(editingId);
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(log: WorkLog, hourlyRate: string) {
    const payload = buildWorkLogPayload({
      userId: log.user_id,
      businessDate: log.business_date,
      hours: editHours,
      hourlyRate,
      overrideAmount: editAmount,
      adjustmentReason: editReason,
    });
    if (!payload) {
      setEditError(
        "Revisá las horas y el monto. Si el monto difiere del calculado, contá el motivo.",
      );
      return;
    }
    setEditPending(true);
    setEditError(null);
    try {
      await api<WorkLog>(`/work-logs/${log.id}`, {
        method: "PUT",
        body: payload,
      });
      setRestoreFocusId(log.id);
      setEditingId(null);
      reload();
    } catch (e) {
      const apiError = e as ApiError;
      setEditError(apiError.message);
      if (apiError.status === 409) reload();
    } finally {
      setEditPending(false);
    }
  }

  async function confirmDelete(log: WorkLog) {
    setDeletePending(true);
    setDeleteError(null);
    try {
      await api(`/work-logs/${log.id}`, { method: "DELETE" });
      setDeleting(null);
      reload();
    } catch (e) {
      const apiError = e as ApiError;
      setDeleteError(apiError.message);
      if (apiError.status === 409) reload();
    } finally {
      setDeletePending(false);
    }
  }

  if (error?.status === 404) {
    return (
      <ErrorState
        error={new ApiError(404, "El usuario no existe.", "message")}
        onRetry={() => router.push("/expenses/payroll")}
      />
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <ListSkeleton rows={4} />;

  const { user, logs, payments, everHadActivity } = data;
  const displayName =
    `${user.first_name} ${user.last_name}`.trim() || user.username;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/expenses/payroll"
        className="text-sm font-medium text-primary hover:text-primary-hover"
      >
        ← Volver a Sueldos
      </Link>

      <PageHeader
        title={displayName}
        titleAdornment={
          <Badge tone={user.active ? "success" : "neutral"}>
            {user.active ? "Activo" : "Inactivo"}
          </Badge>
        }
        description={
          user.active
            ? "Historial de horas cargadas y liquidaciones."
            : "Usuario desactivado: su historial de horas y liquidaciones sigue disponible acá."
        }
      />

      <Card>
        <h2 className="text-sm font-medium text-text-secondary">Período</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Horas cargadas</h2>
        <div className="mt-4 flex flex-col gap-3">
          {logs.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {everHadActivity
                ? "Sin actividad en el período seleccionado."
                : "Todavía no se cargaron horas para este empleado."}
            </p>
          ) : (
            logs.map((log) => {
              const settled = isSettled(log);
              const editable = canEditWorkLog(log);
              const editingThis = editingId === log.id;
              return (
                <div
                  key={log.id}
                  className="flex flex-col gap-3 border-b border-border pb-3 last:border-0"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {formatDate(log.business_date)} · {log.hours} horas
                      </p>
                      <p className="text-sm text-text-secondary">
                        Calculado: {formatMoney(log.computed_amount)} · Final:{" "}
                        {formatMoney(log.final_amount)}
                      </p>
                      {isAdjusted(log) && (
                        <p className="text-sm font-medium text-(--color-warning-strong)">
                          Ajustado:{" "}
                          {log.adjustment_reason || "sin motivo informado"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone={settled ? "neutral" : "success"}>
                        {settled ? "Liquidada" : "Pendiente"}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          ref={(el) => {
                            if (el) editButtonRefs.current.set(log.id, el);
                            else editButtonRefs.current.delete(log.id);
                          }}
                          variant="secondary"
                          disabled={!editable}
                          onClick={() => startEdit(log)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          disabled={!editable}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleting(log);
                          }}
                        >
                          Borrar
                        </Button>
                      </div>
                      {settled && (
                        <p className="max-w-[220px] text-right text-xs text-text-secondary">
                          No se puede editar ni borrar: esta hora ya está
                          liquidada.
                        </p>
                      )}
                    </div>
                  </div>

                  {editingThis && (
                    <div className="rounded-app border border-border bg-surface-subtle p-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input
                          ref={editHoursRef}
                          label="Horas"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editHours}
                          onChange={(event) => setEditHours(event.target.value)}
                        />
                        <Input
                          label="Monto final"
                          value={editAmount}
                          inputMode="decimal"
                          onChange={(event) =>
                            setEditAmount(event.target.value)
                          }
                        />
                        <Input
                          label="Motivo del ajuste"
                          value={editReason}
                          onChange={(event) =>
                            setEditReason(event.target.value)
                          }
                          placeholder="Obligatorio sólo si cambiás el monto"
                        />
                      </div>
                      {editError && (
                        <p role="alert" className="mt-2 text-sm text-error">
                          {editError}
                        </p>
                      )}
                      <div className="mt-3 flex justify-end gap-3">
                        <Button
                          variant="secondary"
                          onClick={cancelEdit}
                          disabled={editPending}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => saveEdit(log, user.hourly_rate ?? "0")}
                          pending={editPending}
                        >
                          {editPending ? "Guardando…" : "Guardar cambios"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Liquidaciones</h2>
        <div className="mt-4 flex flex-col gap-3">
          {payments.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {everHadActivity
                ? "Sin actividad en el período seleccionado."
                : "Todavía no hay liquidaciones para este empleado."}
            </p>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0"
              >
                <div>
                  <p className="font-medium">
                    {formatDate(payment.period_from)} al{" "}
                    {formatDate(payment.period_to)}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {payment.total_hours} horas ·{" "}
                    {formatMoney(payment.total_amount)} ·{" "}
                    {paymentMethodLabel(payment.payment_method)}
                  </p>
                </div>
                <Badge
                  tone={payment.status === "ACTIVE" ? "success" : "neutral"}
                >
                  {payment.status === "ACTIVE" ? "Activa" : "Anulada"}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      <Dialog
        open={deleting !== null}
        title="¿Borrar esta hora?"
        onClose={() => (deletePending ? null : setDeleting(null))}
        dismissible={!deletePending}
      >
        {deleting && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              Vas a borrar {deleting.hours} horas del{" "}
              {formatDate(deleting.business_date)} por{" "}
              {formatMoney(deleting.final_amount)}. No se puede deshacer.
            </p>
            {deleteError && (
              <p role="alert" className="text-sm text-error">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleting(null)}
                disabled={deletePending}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => confirmDelete(deleting)}
                pending={deletePending}
              >
                {deletePending ? "Borrando…" : "Sí, borrar"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
