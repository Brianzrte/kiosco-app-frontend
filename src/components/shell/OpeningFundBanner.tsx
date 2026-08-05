"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconCash } from "@/components/ui/icons";
import { ApiError, api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { CashierOpeningFund } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

export function OpeningFundBanner() {
  const fetcher = useCallback(
    () => api<CashierOpeningFund | null>("/cashier-opening-funds/current"),
    [],
  );
  const { data, error, reload } = useLoad(fetcher);
  const [pending, setPending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function confirm() {
    if (!data || data.status !== "declared") return;
    setPending(true);
    setConfirmError(null);
    try {
      await api<CashierOpeningFund>(`/cashier-opening-funds/${data.id}/confirm`, {
        method: "POST",
      });
      reload();
    } catch (cause) {
      setConfirmError(
        cause instanceof ApiError
          ? cause.message
          : "Ocurrió un error inesperado.",
      );
    } finally {
      setPending(false);
    }
  }

  // The opening check is intentionally silent: it must never distract from or
  // block selling when the backend cannot be reached.
  if (error || !data || data.status !== "declared") return null;

  return (
    <section
      role="status"
      aria-live="polite"
      className="border-b border-warning/30 bg-warning/10"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <IconCash className="mt-0.5 size-5 shrink-0 text-text-primary" />
          <div className="min-w-0">
            <p className="font-medium text-text-primary">Fondo inicial pendiente</p>
            <p className="text-sm text-text-secondary">
              La caja es de <span className="num font-medium text-text-primary">{formatMoney(data.amount)}</span>. Confirmá que la contaste para iniciar tu turno.
            </p>
            {confirmError && <p role="alert" className="mt-1 text-sm text-error">{confirmError}</p>}
          </div>
        </div>
        <Button className="self-start md:self-auto" onClick={confirm} pending={pending}>
          Confirmar conteo
        </Button>
      </div>
    </section>
  );
}
