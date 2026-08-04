"use client";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Input";
import {
  IconAlert,
  IconCheckCircle,
  IconClock,
  IconPartialLines,
  IconTrash,
  IconX,
} from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { statusLabel } from "@/lib/receiving";
import {
  buildReceptionPayload,
  describeReceptionLineResolution,
  formatQuantity,
  isValidReceivedQuantity,
  ReceptionResolutionState,
  summarizeReceptionResolution,
} from "@/lib/purchasing";
import { PurchaseOrder, PurchaseOrderItem } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { AddPurchaseOrderItemForm } from "@/components/purchasing/AddPurchaseOrderItemForm";

const paymentLabels = {
  cash: "Efectivo",
  transfer: "Transferencia",
  account: "Cuenta corriente",
} as const;

type PanelKind = "partial" | "not_delivered";
type PanelDraft = { quantity: string; reason: string };

function omit<T extends Record<string, unknown>>(record: T, key: string): T {
  const next = { ...record };
  delete next[key];
  return next;
}

export function ReceivingDetailView({ id }: { id: string }) {
  const toast = useToast();
  const fetcher = useCallback(
    () => api<PurchaseOrder>(`/purchase-orders/${id}`),
    [id],
  );
  const { data: order, error, reload } = useLoad(fetcher);

  const [resolutions, setResolutions] = useState<ReceptionResolutionState>({});
  const [openPanel, setOpenPanel] = useState<Record<string, PanelKind>>({});
  const [panelDrafts, setPanelDrafts] = useState<Record<string, PanelDraft>>(
    {},
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payment, setPayment] = useState<keyof typeof paymentLabels | "">("");
  const [pending, setPending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [removing, setRemoving] = useState<PurchaseOrderItem | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removePending, setRemovePending] = useState(false);

  const focusRefs = useRef<Record<string, HTMLElement | null>>({});
  function registerRef<T extends HTMLElement>(key: string) {
    return (el: T | null) => {
      focusRefs.current[key] = el;
    };
  }
  const focus = (key: string) =>
    requestAnimationFrame(() => focusRefs.current[key]?.focus());

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!order) return <LoadingState />;

  const activeItems = order.items.filter((item) => !item.removed_at);
  const removedItems = order.items.filter((item) => item.removed_at);
  const editable = order.status === "PENDING";
  const receivedBy = order.received_by_name ?? order.received_by;
  const summary = summarizeReceptionResolution(activeItems, resolutions);

  function markReceivedAll(item: PurchaseOrderItem) {
    setResolutions((current) => ({
      ...current,
      [item.id]: { action: "received_all" },
    }));
    setOpenPanel((current) => omit(current, item.id));
    focus(`${item.id}:undo`);
  }

  function openPartialPanel(item: PurchaseOrderItem) {
    setOpenPanel((current) => ({ ...current, [item.id]: "partial" }));
    setPanelDrafts((current) => ({
      ...current,
      [item.id]: { quantity: formatQuantity(item.quantity), reason: "" },
    }));
    focus(`${item.id}:qty`);
  }

  function openNotDeliveredPanel(item: PurchaseOrderItem) {
    setOpenPanel((current) => ({ ...current, [item.id]: "not_delivered" }));
    setPanelDrafts((current) => ({
      ...current,
      [item.id]: { quantity: "0", reason: "" },
    }));
    focus(`${item.id}:reason`);
  }

  function updatePanelDraft(
    itemId: string,
    field: keyof PanelDraft,
    value: string,
  ) {
    setPanelDrafts((current) => ({
      ...current,
      [itemId]: { ...current[itemId], [field]: value },
    }));
  }

  function confirmPartial(item: PurchaseOrderItem) {
    const draft = panelDrafts[item.id];
    const quantity = Number(draft?.quantity);
    const reason = draft?.reason.trim() ?? "";
    if (
      !isValidReceivedQuantity(quantity, item.quantity) ||
      quantity <= 0 ||
      quantity >= item.quantity ||
      !reason
    ) {
      return;
    }
    setResolutions((current) => ({
      ...current,
      [item.id]: {
        action: "received_partial",
        receivedQuantity: quantity,
        reason,
      },
    }));
    setOpenPanel((current) => omit(current, item.id));
    focus(`${item.id}:undo`);
  }

  function confirmNotDelivered(item: PurchaseOrderItem) {
    const reason = panelDrafts[item.id]?.reason.trim() ?? "";
    if (!reason) return;
    setResolutions((current) => ({
      ...current,
      [item.id]: { action: "not_delivered", reason },
    }));
    setOpenPanel((current) => omit(current, item.id));
    focus(`${item.id}:undo`);
  }

  function undo(item: PurchaseOrderItem) {
    setResolutions((current) => omit(current, item.id));
    setOpenPanel((current) => omit(current, item.id));
    focus(`${item.id}:receivedAll`);
  }

  function openConfirm() {
    setConfirmError(null);
    setConfirmOpen(true);
  }

  async function receive() {
    if (!payment) return;
    setPending(true);
    setConfirmError(null);
    try {
      const items = buildReceptionPayload(activeItems, resolutions);
      await api(`/purchase-orders/${id}/receive`, {
        method: "POST",
        body: { payment_method: payment, items },
      });
      toast(
        "success",
        summary.outcome === "cancel" ? "Pedido cancelado" : "Pedido recibido",
      );
      setConfirmOpen(false);
      reload();
    } catch (cause) {
      setConfirmError((cause as ApiError).message);
      if ((cause as ApiError).status === 409) reload();
    } finally {
      setPending(false);
    }
  }

  async function removeConfirmed() {
    if (!removing || !removeReason.trim()) return;
    setRemovePending(true);
    setRemoveError(null);
    try {
      await api(`/purchase-orders/${id}/items/${removing.id}`, {
        method: "DELETE",
        body: { reason: removeReason.trim() },
      });
      toast("success", "Ítem removido");
      setRemoving(null);
      setRemoveReason("");
      reload();
    } catch (cause) {
      setRemoveError((cause as ApiError).message);
    } finally {
      setRemovePending(false);
    }
  }

  const confirmLabel =
    summary.outcome === "cancel"
      ? "Confirmar y cancelar pedido"
      : "Confirmar recepción";
  const allResolved =
    summary.totalCount > 0 && summary.resolvedCount === summary.totalCount;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/purchasing"
        className="text-sm font-medium text-primary hover:text-primary-hover"
      >
        ← Volver a compras
      </Link>
      <PageHeader
        title={`Pedido de ${order.supplier_name}`}
        description={new Intl.DateTimeFormat("es-AR", {
          dateStyle: "long",
        }).format(new Date(order.ordered_at))}
        titleAdornment={
          <Badge
            tone={
              editable
                ? "warning"
                : order.status === "CANCELLED"
                  ? "neutral"
                  : "success"
            }
            icon={
              editable ? (
                <IconClock className="size-3" />
              ) : order.status === "CANCELLED" ? (
                <IconX className="size-3" />
              ) : (
                <IconCheckCircle className="size-3" />
              )
            }
          >
            {statusLabel(order.status)}
          </Badge>
        }
        actions={
          editable && (
            <AddPurchaseOrderItemForm
              orderId={id}
              context={`Pedido de ${order.supplier_name} · llegó algo que no estaba en la orden original.`}
              onAdded={reload}
            />
          )
        }
      />

      {editable && (
        <p className="flex items-center gap-2 rounded-app border border-warning/40 bg-warning/10 p-3 text-sm text-text-primary">
          <IconAlert className="size-[18px] shrink-0 text-warning" />
          <span>
            <strong>
              Si no recibís ningún ítem de este pedido, se cancela
              automáticamente.
            </strong>{" "}
            Cada línea necesita una acción antes de poder confirmar.
          </span>
        </p>
      )}

      {editable && activeItems.length === 0 && (
        <Card>
          <p className="text-sm text-text-secondary">
            No hay líneas activas para recibir en este pedido.
          </p>
        </Card>
      )}

      {editable &&
        activeItems.map((item) => {
          const resolution = resolutions[item.id];
          const panel = openPanel[item.id];
          const draft = panelDrafts[item.id] ?? {
            quantity: String(item.quantity),
            reason: "",
          };
          return (
            <Card key={item.id} className="flex flex-col gap-2.5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold text-text-primary">
                      {item.product_name ?? item.description}
                    </p>
                    {!item.product_id && (
                      <Badge
                        tone="warning"
                        icon={<IconAlert className="size-3" />}
                      >
                        Pendiente de alta
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Solicitado: {formatQuantity(item.quantity)} · Costo
                    unitario: {formatMoney(item.unit_cost)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <p className="num text-[15px] font-semibold text-text-primary">
                    {formatMoney(item.subtotal)}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label="Quitar del pedido"
                    title="Quitar del pedido"
                    className="text-error hover:bg-error/10"
                    onClick={() => {
                      setRemoving(item);
                      setRemoveReason("");
                      setRemoveError(null);
                    }}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              </div>

              {resolution ? (
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-app border p-3 text-sm ${
                    resolution.action === "received_all"
                      ? "border-success/35 bg-success/10 text-(--color-success-strong)"
                      : resolution.action === "received_partial"
                        ? "border-warning/35 bg-warning/10 text-(--color-warning-strong)"
                        : "border-error/35 bg-error/10 text-(--color-error-strong)"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    {resolution.action === "received_all" && (
                      <IconCheckCircle className="size-[15px] shrink-0" />
                    )}
                    {resolution.action === "received_partial" && (
                      <IconPartialLines className="size-[15px] shrink-0" />
                    )}
                    {resolution.action === "not_delivered" && (
                      <IconTrash className="size-[15px] shrink-0" />
                    )}
                    {describeReceptionLineResolution(resolution, item.quantity)}
                  </span>
                  <Button
                    ref={registerRef<HTMLButtonElement>(`${item.id}:undo`)}
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => undo(item)}
                  >
                    Deshacer
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      ref={registerRef<HTMLButtonElement>(
                        `${item.id}:receivedAll`,
                      )}
                      type="button"
                      variant="success-tint"
                      className="min-h-11 flex-1 gap-2"
                      onClick={() => markReceivedAll(item)}
                    >
                      <IconCheckCircle className="size-4" /> Recibí todo
                    </Button>
                    <Button
                      type="button"
                      variant="warning-tint"
                      className="min-h-11 flex-1 gap-2"
                      onClick={() => openPartialPanel(item)}
                    >
                      <IconPartialLines className="size-4" /> Recibí menos
                    </Button>
                    <Button
                      type="button"
                      variant="danger-tint"
                      className="min-h-11 flex-1 gap-2"
                      onClick={() => openNotDeliveredPanel(item)}
                    >
                      <IconTrash className="size-4" /> Sacar línea
                    </Button>
                  </div>
                  {panel === "partial" && (
                    <div className="flex flex-col gap-3 rounded-app border border-border p-3 sm:flex-row sm:items-end">
                      <Input
                        ref={registerRef<HTMLInputElement>(`${item.id}:qty`)}
                        label="Cantidad recibida"
                        type="number"
                        min="0"
                        max={item.quantity - 1}
                        inputMode="numeric"
                        value={draft.quantity}
                        onChange={(event) =>
                          updatePanelDraft(
                            item.id,
                            "quantity",
                            event.target.value,
                          )
                        }
                      />
                      <Input
                        label="Motivo de la diferencia"
                        placeholder="Ej: llegaron rotas, faltante del proveedor…"
                        required
                        aria-describedby={`${item.id}-partial-hint`}
                        value={draft.reason}
                        onChange={(event) =>
                          updatePanelDraft(
                            item.id,
                            "reason",
                            event.target.value,
                          )
                        }
                        className="flex-1"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setOpenPanel((current) => omit(current, item.id))
                          }
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="warning"
                          disabled={
                            !draft.reason.trim() ||
                            !isValidReceivedQuantity(
                              Number(draft.quantity),
                              item.quantity,
                            ) ||
                            Number(draft.quantity) <= 0 ||
                            Number(draft.quantity) >= item.quantity
                          }
                          aria-disabled={!draft.reason.trim()}
                          onClick={() => confirmPartial(item)}
                        >
                          Confirmar recepción parcial
                        </Button>
                      </div>
                      <p id={`${item.id}-partial-hint`} className="sr-only">
                        Completá el motivo para confirmar esta línea.
                      </p>
                    </div>
                  )}
                  {panel === "not_delivered" && (
                    <div className="flex flex-col gap-3 rounded-app border border-border p-3 sm:flex-row sm:items-end">
                      <Input
                        ref={registerRef<HTMLInputElement>(`${item.id}:reason`)}
                        label="Motivo de no entrega"
                        placeholder="Ej: el proveedor no lo trajo, producto discontinuado…"
                        required
                        aria-describedby={`${item.id}-not-delivered-hint`}
                        value={draft.reason}
                        onChange={(event) =>
                          updatePanelDraft(
                            item.id,
                            "reason",
                            event.target.value,
                          )
                        }
                        className="flex-1"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setOpenPanel((current) => omit(current, item.id))
                          }
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={!draft.reason.trim()}
                          aria-disabled={!draft.reason.trim()}
                          onClick={() => confirmNotDelivered(item)}
                        >
                          Confirmar y sacar línea
                        </Button>
                      </div>
                      <p
                        id={`${item.id}-not-delivered-hint`}
                        className="sr-only"
                      >
                        Completá el motivo para sacar esta línea del pedido.
                      </p>
                    </div>
                  )}
                </>
              )}
            </Card>
          );
        })}

      {!editable &&
        activeItems.map((item) => (
          <Card
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-medium text-text-primary">
                {item.product_name ?? item.description}
              </p>
              {!item.product_id && (
                <Badge className="mt-1" tone="warning">
                  Pendiente de alta
                </Badge>
              )}
              {item.non_delivery_reason && (
                <p className="mt-1 text-xs text-text-secondary">
                  Motivo: {item.non_delivery_reason}
                </p>
              )}
            </div>
            <dl className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <dt className="text-text-secondary">Solicitado</dt>
                <dd className="num">{formatQuantity(item.quantity)}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Recibido</dt>
                <dd className="num">
                  {formatQuantity(item.received_quantity)}
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary">Subtotal</dt>
                <dd className="num font-medium">
                  {formatMoney(item.subtotal)}
                </dd>
              </div>
            </dl>
          </Card>
        ))}

      {removedItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-text-secondary">
            Líneas dadas de baja
          </h2>
          <ul className="flex flex-col gap-2">
            {removedItems.map((item) => (
              <li
                key={item.id}
                className="rounded-app border border-border bg-surface-subtle p-3 text-sm text-text-secondary line-through"
              >
                <span className="no-underline">
                  {item.product_name ?? item.description} — Motivo:{" "}
                  {item.removal_reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(!editable || activeItems.length === 0) && (
        <Card className="flex items-center justify-between">
          <span className="font-medium">Total</span>
          <span className="num text-lg font-semibold">
            {formatMoney(order.total)}
          </span>
        </Card>
      )}

      {!editable && order.status !== "PENDING" && (
        <Card>
          <h2 className="font-medium">
            {order.status === "CANCELLED"
              ? "Recepción registrada (sin mercadería)"
              : "Recepción registrada"}
          </h2>
          <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
            <div>
              <dt className="text-text-secondary">Recibió</dt>
              <dd>{receivedBy ?? "Usuario no disponible"}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Fecha y hora</dt>
              <dd>
                {order.received_at
                  ? new Intl.DateTimeFormat("es-AR", {
                      dateStyle: "long",
                      timeStyle: "short",
                    }).format(new Date(order.received_at))
                  : "No disponible"}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Método de pago</dt>
              <dd>
                {order.payment_method
                  ? paymentLabels[order.payment_method]
                  : "No disponible"}
              </dd>
            </div>
          </dl>
        </Card>
      )}

      {editable && activeItems.length > 0 && (
        <Card className="sticky bottom-0 z-10 flex flex-col gap-3 shadow-soft-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p aria-live="polite" className="text-sm text-text-secondary">
              {summary.resolvedCount} de {summary.totalCount} líneas resueltas
            </p>
            <p className="mt-0.5 text-lg font-bold text-text-primary">
              Total del pedido:{" "}
              <span className="num">{formatMoney(order.total)}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {allResolved && summary.outcome === "cancel" && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-error">
                <IconAlert className="size-[15px] shrink-0" />
                No vas a recibir nada de este pedido.
              </span>
            )}
            <Button
              disabled={!allResolved}
              aria-disabled={!allResolved}
              variant={summary.outcome === "cancel" ? "danger" : "primary"}
              onClick={openConfirm}
            >
              {allResolved
                ? confirmLabel
                : "Resolvé todas las líneas para confirmar"}
            </Button>
          </div>
        </Card>
      )}

      <Dialog
        open={confirmOpen}
        title={confirmLabel}
        onClose={() => {
          if (pending) return;
          setConfirmOpen(false);
        }}
        dismissible={!pending}
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary">
            Se registrarán tu usuario, la fecha y hora, las cantidades
            entregadas, los movimientos de stock y el cierre del pedido.
            {summary.outcome === "cancel" &&
              " Ninguna línea tiene mercadería recibida: el pedido va a quedar cancelado."}
          </p>
          <ul className="text-sm text-text-secondary">
            <li>
              Completas:{" "}
              {
                activeItems.filter(
                  (item) => resolutions[item.id]?.action === "received_all",
                ).length
              }
            </li>
            <li>
              Parciales:{" "}
              {
                activeItems.filter(
                  (item) => resolutions[item.id]?.action === "received_partial",
                ).length
              }
            </li>
            <li>
              No entregadas:{" "}
              {
                activeItems.filter(
                  (item) => resolutions[item.id]?.action === "not_delivered",
                ).length
              }
            </li>
          </ul>
          <Select
            label="Método de pago"
            value={payment}
            onChange={(event) =>
              setPayment(event.target.value as keyof typeof paymentLabels | "")
            }
          >
            <option value="">Elegí un método</option>
            {Object.entries(paymentLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {summary.outcome === "cancel" && (
            <p className="text-xs text-text-secondary">
              El método de pago se guarda igual, aunque no ingrese mercadería.
            </p>
          )}
          {confirmError && (
            <p role="alert" className="text-sm text-error">
              {confirmError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={receive} disabled={!payment} pending={pending}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={removing !== null}
        title="Quitar del pedido"
        onClose={() => setRemoving(null)}
        dismissible={!removePending}
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary">
            Esta acción es inmediata, no se puede deshacer, y no es la forma de
            registrar una no entrega: para eso usá “Sacar línea”.
          </p>
          <Input
            label="Motivo"
            required
            value={removeReason}
            onChange={(event) => setRemoveReason(event.target.value)}
            error={removeError ?? undefined}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setRemoving(null)}
              disabled={removePending}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={removeConfirmed}
              disabled={!removeReason.trim()}
              pending={removePending}
            >
              Quitar del pedido
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
