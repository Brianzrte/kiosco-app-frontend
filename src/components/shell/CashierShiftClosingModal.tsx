"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import { isCountedCash } from "@/lib/cashClosing";
import { formatMoney } from "@/lib/money";
import { CashClosing, CashClosingStatus } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

function currentBusinessDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CashierShiftClosingModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const date = useMemo(() => currentBusinessDate(), []);
  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedClosing, setSavedClosing] = useState<CashClosing | null>(null);
  const fetcher = useCallback(
    () => api<CashClosingStatus>(`/cash-closings/current-status?date=${date}`),
    [date],
  );
  const { data: status, error, reload } = useLoad(fetcher);
  const latestClosing = savedClosing ?? status?.latest_closing ?? null;
  const canCorrect = latestClosing?.state === "provisional";
  const countedCashError = countedCash && !isCountedCash(countedCash)
    ? "Ingresá un importe con hasta dos decimales."
    : undefined;

  async function saveClosing() {
    if (!isCountedCash(countedCash)) return;
    setPending(true);
    setSaveError(null);
    try {
      const closing = await api<CashClosing>(
        canCorrect ? `/cash-closings/${latestClosing.id}` : "/cash-closings",
        {
          method: canCorrect ? "PUT" : "POST",
          body: { to: new Date().toISOString(), counted_cash: countedCash, notes },
        },
      );
      setSavedClosing(closing);
      setConfirming(false);
      toast("success", canCorrect ? "Cierre de caja actualizado" : "Cierre de caja registrado");
      onSaved();
      reload();
    } catch (cause) {
      setSaveError(cause instanceof ApiError ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setPending(false);
    }
  }

  if (savedClosing) {
    return (
      <Dialog open title="Cierre de caja registrado" onClose={onClose}>
        <div className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary">El backend calculó el cierre de tu turno.</p>
          <ClosingSummary closing={savedClosing} openingFund={status?.opening_fund ?? null} />
          <Button onClick={onClose}>Listo</Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open title={confirming ? "Confirmar cierre de caja" : "Cierre de caja"} onClose={onClose} dismissible={!pending}>
      {error ? (
        <div className="flex flex-col gap-4" role="alert">
          <p className="text-sm text-text-secondary">{error.message}</p>
          <Button variant="secondary" onClick={reload} className="self-start">Reintentar</Button>
        </div>
      ) : !status ? (
        <p role="status" className="py-6 text-sm text-text-secondary">Cargando estado de caja…</p>
      ) : latestClosing?.state === "sealed" ? (
        <div className="flex flex-col gap-5"><p className="text-sm text-text-secondary">Este cierre ya quedó sellado y no se puede corregir.</p><ClosingSummary closing={latestClosing} openingFund={status.opening_fund} /><Button onClick={onClose}>Cerrar</Button></div>
      ) : confirming ? (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary">El backend calculará el efectivo esperado y la diferencia usando el turno activo.</p>
          {status.opening_fund && <OpeningFundSummary amount={status.opening_fund.amount} />}
          <p className="num rounded-app border border-border bg-surface-2 p-4 text-lg font-semibold">Efectivo contado: {formatMoney(countedCash)}</p>
          {saveError && <p role="alert" className="text-sm text-error">{saveError}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>Volver</Button><Button onClick={saveClosing} pending={pending}>{canCorrect ? "Confirmar corrección" : "Confirmar cierre"}</Button></div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary">Ingresá el efectivo contado. El cierre corresponde a tu turno activo.</p>
          {status.opening_fund && <OpeningFundSummary amount={status.opening_fund.amount} />}
          {canCorrect && <ClosingSummary closing={latestClosing} openingFund={status.opening_fund} />}
          <Input label="Efectivo contado" type="text" inputMode="decimal" pattern="\d+(\.\d{1,2})?" placeholder="0.00" value={countedCash} onChange={(event) => setCountedCash(event.target.value)} error={countedCashError} />
          <Input label="Notas (opcional)" value={notes} onChange={(event) => setNotes(event.target.value)} />
          {saveError && <p role="alert" className="text-sm text-error">{saveError}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => setConfirming(true)} disabled={!isCountedCash(countedCash)}>{canCorrect ? "Revisar corrección" : "Revisar cierre"}</Button></div>
        </div>
      )}
    </Dialog>
  );
}

function OpeningFundSummary({ amount }: { amount: string }) {
  return <div className="rounded-app border border-border bg-surface-2 p-4"><p className="text-sm text-text-secondary">Fondo inicial del turno</p><p className="num mt-1 text-2xl font-semibold text-text-primary">{formatMoney(amount)}</p><p className="mt-1 text-sm text-text-secondary">Está incluido en el efectivo esperado que calcula el backend.</p></div>;
}

function ClosingSummary({ closing, openingFund }: { closing: CashClosing; openingFund: CashClosingStatus["opening_fund"] }) {
  return <dl className="grid gap-3 rounded-app border border-border bg-surface-2 p-4 text-sm">{openingFund && <div className="flex justify-between gap-4"><dt className="text-text-secondary">Fondo inicial</dt><dd className="num font-semibold">{formatMoney(openingFund.amount)}</dd></div>}<div className="flex justify-between gap-4"><dt className="text-text-secondary">Turno</dt><dd className="text-right">{formatTimestamp(closing.from)} — {formatTimestamp(closing.to)}</dd></div><div className="flex justify-between gap-4"><dt className="text-text-secondary">Efectivo esperado</dt><dd className="num font-semibold">{formatMoney(closing.expected_cash)}</dd></div><div className="flex justify-between gap-4"><dt className="text-text-secondary">Efectivo contado</dt><dd className="num font-semibold">{formatMoney(closing.counted_cash)}</dd></div><div className="flex justify-between gap-4 border-t border-border pt-3"><dt className="font-medium">Diferencia</dt><dd className="num font-semibold">{formatMoney(closing.difference)}</dd></div><div className="flex justify-between gap-4"><dt className="text-text-secondary">Estado</dt><dd>{closing.state === "sealed" ? "Sellado" : "Provisional"}</dd></div></dl>;
}
