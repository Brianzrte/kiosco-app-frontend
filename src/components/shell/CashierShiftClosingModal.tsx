"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import { cashDifference, isCountedCash } from "@/lib/cashClosing";
import { formatMoney } from "@/lib/money";
import { useLoad } from "@/lib/useLoad";
import { CashClosing, CashierShiftSummary } from "@/lib/types";

type ShiftRange = { date: string; from: string; to: string };

function currentShiftRange(): ShiftRange {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;

  return { date, from: start.toISOString(), to: now.toISOString() };
}

export function CashierShiftClosingModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const toast = useToast();
  const range = useMemo(() => currentShiftRange(), []);
  const [countedCash, setCountedCash] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fetcher = useCallback(
    () => api<CashierShiftSummary>(`/sales/summary?from=${range.date}&to=${range.date}`),
    [range.date],
  );
  const { data: summary, error, reload } = useLoad(fetcher);

  const difference = summary
    ? cashDifference(summary.total_cash, countedCash)
    : null;
  const countedCashError =
    countedCash && !isCountedCash(countedCash)
      ? "Ingresá un importe con hasta dos decimales."
      : undefined;

  async function saveClosing() {
    if (!summary || difference === null) return;

    setPending(true);
    setSaveError(null);
    try {
      await api<CashClosing>("/cash-closings", {
        method: "POST",
        body: {
          from: range.from,
          to: range.to,
          counted_cash: countedCash,
        },
      });
      toast("success", "Cierre de caja registrado");
      onClose();
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Ocurrió un error inesperado.";
      setSaveError(message);
      toast("error", message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      title={confirming ? "Confirmar cierre de caja" : "Cierre de caja"}
      onClose={onClose}
      dismissible={!pending}
    >
      {error ? (
        <div className="flex flex-col gap-4" role="alert">
          <p className="text-sm text-text-secondary">{error.message}</p>
          <Button variant="secondary" onClick={reload} className="self-start">
            Reintentar
          </Button>
        </div>
      ) : !summary ? (
        <p role="status" className="py-6 text-sm text-text-secondary">
          Cargando efectivo esperado…
        </p>
      ) : confirming ? (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary">
            Revisá los importes antes de registrar el cierre. Esta acción no se
            puede deshacer desde la app.
          </p>
          <dl className="grid gap-3 rounded-app border border-border bg-surface-2 p-4 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-text-secondary">Efectivo esperado</dt>
              <dd className="num font-semibold text-text-primary">
                {formatMoney(summary.total_cash)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-text-secondary">Efectivo contado</dt>
              <dd className="num font-semibold text-text-primary">
                {formatMoney(countedCash)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
              <dt className="font-medium text-text-primary">Diferencia</dt>
              <dd className="num font-semibold text-text-primary">
                {formatMoney(difference!)}
              </dd>
            </div>
          </dl>
          {saveError && (
            <p role="alert" className="text-sm text-error">
              {saveError}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              Volver
            </Button>
            <Button onClick={saveClosing} pending={pending}>
              {pending ? "Registrando…" : "Confirmar cierre"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="rounded-app border border-border bg-surface-2 p-4">
            <p className="text-sm text-text-secondary">Efectivo esperado hoy</p>
            <p className="num mt-1 text-2xl font-semibold text-text-primary">
              {formatMoney(summary.total_cash)}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {summary.total_sales} ventas confirmadas en el día.
            </p>
          </div>
          <Input
            label="Efectivo contado"
            type="text"
            inputMode="decimal"
            pattern="\\d+(\\.\\d{1,2})?"
            placeholder="0.00"
            title="Número con hasta dos decimales, p. ej. 1250.50"
            value={countedCash}
            onChange={(event) => setCountedCash(event.target.value)}
            error={countedCashError}
          />
          {difference !== null && (
            <div className="flex items-baseline justify-between gap-4 rounded-app border border-border bg-surface-2 px-4 py-3">
              <span className="text-sm font-medium text-text-secondary">
                Diferencia
              </span>
              <span className="num text-lg font-semibold text-text-primary">
                {formatMoney(difference)}
              </span>
            </div>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => setConfirming(true)}
              disabled={difference === null}
            >
              Revisar cierre
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
