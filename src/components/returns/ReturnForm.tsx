"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import {
  buildReturnPayload,
  computeAvailability,
  computeSelectionValue,
  hasAnySelection,
  isValidReason,
  ReturnLineSelection,
} from "@/lib/returns";
import { Return, SaleItem } from "@/lib/types";

type Stage = "select" | "confirm";

export function ReturnForm({
  saleId,
  items,
  returns,
  onRegistered,
  onReloadAvailability,
  onClose,
}: {
  saleId: string;
  items: SaleItem[];
  returns: Return[];
  onRegistered: () => void;
  onReloadAvailability: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const availability = useMemo(
    () => computeAvailability(items, returns),
    [items, returns],
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [stage, setStage] = useState<Stage>("select");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Clamped against the current availability on every render: a reload after
  // a concurrency rejection can lower `available` below a quantity chosen
  // before the reload, and the selection must never outlive that.
  const lines: ReturnLineSelection[] = availability.map((item) => ({
    saleItemId: item.saleItemId,
    quantity: Math.min(quantities[item.saleItemId] ?? 0, item.available),
  }));
  const quantityBySaleItemId = new Map(
    lines.map((line) => [line.saleItemId, line.quantity]),
  );

  function setQuantity(saleItemId: string, value: number, max: number) {
    const bounded = Math.min(Math.max(0, value), max);
    setQuantities((current) => ({ ...current, [saleItemId]: bounded }));
  }

  const canReview = hasAnySelection(lines) && isValidReason(reason);
  const selectionValue = computeSelectionValue(lines, availability);

  async function confirm() {
    setError(null);
    setPending(true);
    try {
      await api(`/sales/${saleId}/returns`, {
        method: "POST",
        body: buildReturnPayload(reason, lines),
      });
      toast("success", "Devolución registrada");
      onRegistered();
    } catch (e) {
      // Rechazo por concurrencia u otra causa: se muestra el mensaje del
      // backend tal cual y se recargan las disponibilidades (design.md) —
      // volvemos a "select" para que la lista se recomponga con datos frescos.
      setError((e as ApiError).message);
      setStage("select");
      onReloadAvailability();
    } finally {
      setPending(false);
    }
  }

  if (stage === "confirm") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 rounded-app bg-surface-2 p-4 text-sm">
          <p>
            Se van a dar de baja{" "}
            <strong className="font-medium">
              {lines.reduce((sum, line) => sum + line.quantity, 0)} unidades
            </strong>{" "}
            de esta venta.
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-text-secondary">
              Valor de la mercadería devuelta
            </span>
            <span className="num text-lg font-semibold">
              {formatMoney(selectionValue)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-app border border-warning/40 bg-warning/10 p-4 text-sm text-text-primary">
          <p>
            El sistema registra la devolución y reintegra el stock. Este monto{" "}
            <strong>no se reintegra automáticamente</strong>: si corresponde
            entregar dinero, se hace en el mostrador.
          </p>
          <p>
            Esta devolución <strong>no se puede deshacer</strong> desde la
            aplicación. La única corrección posterior es un ajuste manual de
            stock, que no borra este registro.
          </p>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStage("select")}
            disabled={pending}
          >
            Volver
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={confirm}
            pending={pending}
          >
            {pending ? "Registrando…" : "Confirmar devolución"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-3">
        {availability.map((item) => {
          const exhausted = item.available === 0;
          const value = quantityBySaleItemId.get(item.saleItemId) ?? 0;
          return (
            <li
              key={item.saleItemId}
              className="rounded-app border border-border p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{item.productName}</p>
                {exhausted && <Badge tone="neutral">Ya devuelto</Badge>}
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                vendidas {item.sold} · ya devueltas {item.alreadyReturned} ·
                disponibles {item.available}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-9 px-0"
                  disabled={exhausted || value <= 0}
                  onClick={() =>
                    setQuantity(item.saleItemId, value - 1, item.available)
                  }
                  aria-label={`Restar unidad de ${item.productName}`}
                >
                  −
                </Button>
                <span className="num w-8 text-center font-semibold">
                  {value}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-9 px-0"
                  disabled={exhausted || value >= item.available}
                  onClick={() =>
                    setQuantity(item.saleItemId, value + 1, item.available)
                  }
                  aria-label={`Sumar unidad de ${item.productName}`}
                >
                  +
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div>
        <label
          htmlFor="return-reason"
          className="mb-1.5 block text-sm font-medium"
        >
          Motivo (obligatorio)
        </label>
        <textarea
          id="return-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Ej. cobré el producto equivocado, me di cuenta al toque"
          className="w-full rounded-app border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled hover:border-border-hover focus:border-primary"
        />
        <p className="mt-1.5 text-xs text-text-secondary">
          Queda en la traza permanente de la devolución y del movimiento de
          stock.
        </p>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={!canReview}
          onClick={() => setStage("confirm")}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
