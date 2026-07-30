"use client";

import { RefObject, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { IconCash, IconInfoCircle } from "@/components/ui/icons";
import {
  CASH_CLOSING_STATUS_CHANGED,
  reconciliationStatusLabel,
  reconciliationStatusTone,
} from "@/lib/cashClosing";
import { api } from "@/lib/api";
import { CashClosingStatus } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

function currentBusinessDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function closingTime(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CashierReconciliationIndicator({
  onOpenClosing,
  triggerRef,
}: {
  onOpenClosing: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const date = useMemo(() => currentBusinessDate(), []);
  const [latestStatus, setLatestStatus] = useState<CashClosingStatus | null>(null);
  const fetcher = useCallback(
    async () => {
      const status = await api<CashClosingStatus>(
        `/cash-closings/current-status?date=${date}`,
      );
      setLatestStatus(status);
      return status;
    },
    [date],
  );
  const { data, error, reload } = useLoad(fetcher);

  useEffect(() => {
    window.addEventListener(CASH_CLOSING_STATUS_CHANGED, reload);
    return () => window.removeEventListener(CASH_CLOSING_STATUS_CHANGED, reload);
  }, [reload]);

  if (error) {
    return (
      <div className="min-w-0" role="alert">
        <button
          ref={triggerRef}
          type="button"
          onClick={onOpenClosing}
          className="flex min-h-11 min-w-11 items-center gap-1.5 rounded-app px-2 py-1.5 text-sm font-medium text-error transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-error/10 md:px-3"
          aria-describedby="cash-closing-status-error"
          title={`No se pudo actualizar el estado de caja: ${error.message}`}
        >
          <IconInfoCircle className="size-4 shrink-0" />
          <span className="hidden lg:inline">Estado sin actualizar</span>
          <span className="sr-only">Abrir cierre de caja</span>
        </button>
        <p id="cash-closing-status-error" className="sr-only">
          No se pudo actualizar el estado de caja: {error.message}
        </p>
        <button
          type="button"
          onClick={reload}
          className="sr-only"
        >
          Reintentar actualización del estado de caja
        </button>
      </div>
    );
  }

  const visibleStatus = data ?? latestStatus;
  if (!visibleStatus) {
    return (
      <span
        role="status"
        className="flex min-h-11 items-center gap-1.5 px-2 py-1.5 text-sm text-text-secondary md:px-3"
      >
        <IconCash className="size-4 shrink-0" />
        <span className="hidden lg:inline">Actualizando caja…</span>
        <span className="sr-only">Actualizando estado de caja</span>
      </span>
    );
  }

  const label = reconciliationStatusLabel(visibleStatus.status);
  const time = visibleStatus.latest_closing
    ? closingTime(visibleStatus.latest_closing.closed_at)
    : null;

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={onOpenClosing}
      className="flex min-h-11 min-w-11 items-center gap-1.5 rounded-app px-2 py-1.5 text-sm font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover md:px-3"
      aria-label={time ? `${label}, ${time}. Abrir cierre de caja` : `${label}. Abrir cierre de caja`}
      aria-busy={data === null || undefined}
    >
      <IconCash className="size-4 shrink-0 text-text-secondary" />
      <Badge tone={reconciliationStatusTone(visibleStatus.status)} className="hidden lg:inline-flex">
        {label}
      </Badge>
      {time && <span className="hidden xl:inline text-xs text-text-secondary">{time}</span>}
      <span className="sr-only">{time ? `${label}, ${time}` : label}</span>
    </button>
  );
}
