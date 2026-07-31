"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Input";
import { IconTrash } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { statusLabel } from "@/lib/receiving";
import { PurchaseOrder, PurchaseOrderItem } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { AddPurchaseOrderItemForm } from "./AddPurchaseOrderItemForm";
const paymentLabels = {
  cash: "Efectivo",
  transfer: "Transferencia",
  account: "Cuenta corriente",
} as const;
type ReceptionDraft = Record<string, { quantity: string; reason: string }>;

export function ReceivingDetailView({ id }: { id: string }) {
  const toast = useToast();
  const fetcher = useCallback(
    () => api<PurchaseOrder>(`/purchase-orders/${id}`),
    [id],
  );
  const { data: order, error, reload } = useLoad(fetcher);
  const activeItems = order?.items.filter((item) => !item.removed_at) ?? [];
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [payment, setPayment] = useState<keyof typeof paymentLabels | "">("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<PurchaseOrderItem | null>(null);
  const [reason, setReason] = useState("");
  const [receptionItems, setReceptionItems] = useState<ReceptionDraft>({});
  async function receive() {
    if (!payment) return;
    const items = Object.entries(receptionItems).map(([itemId, item]) => ({
      item_id: itemId,
      received_quantity: Number(item.quantity),
      non_delivery_reason: item.reason.trim() || undefined,
    }));
    if (
      items.length === 0 ||
      items.some(
        (item) =>
          !Number.isInteger(item.received_quantity) || item.received_quantity < 0,
      )
    ) {
      setFormError("Ingresá una cantidad entregada válida para cada ítem activo.");
      return;
    }
    if (
      activeItems.some((item) => {
        const receipt = receptionItems[item.id];
        return Number(receipt?.quantity) < item.quantity && !receipt?.reason.trim();
      })
    ) {
      setFormError("Indicá un motivo para cada entrega incompleta.");
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      await api(`/purchase-orders/${id}/receive`, {
        method: "POST",
        body: { payment_method: payment, items },
      });
      toast("success", "Pedido recibido");
      setReceiveOpen(false);
      reload();
    } catch (e) {
      setFormError((e as ApiError).message);
      if ((e as ApiError).status === 409) reload();
    } finally {
      setPending(false);
    }
  }
  async function remove() {
    if (!removing || !reason.trim()) return;
    setPending(true);
    setFormError(null);
    try {
      await api(`/purchase-orders/${id}/items/${removing.id}`, {
        method: "DELETE",
        body: { reason: reason.trim() },
      });
      toast("success", "Ítem removido");
      setRemoving(null);
      setReason("");
      reload();
    } catch (e) {
      setFormError((e as ApiError).message);
    } finally {
      setPending(false);
    }
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!order) return <LoadingState />;
  const editable = order.status === "PENDING";
  const receivedBy = order.received_by_name ?? order.received_by;

  function openReception() {
    setReceptionItems(
      Object.fromEntries(
        activeItems.map((item) => [item.id, { quantity: String(item.quantity), reason: "" }]),
      ),
    );
    setFormError(null);
    setReceiveOpen(true);
  }

  function updateReceptionItem(
    itemId: string,
    field: "quantity" | "reason",
    value: string,
  ) {
    setReceptionItems((current) => ({
      ...current,
      [itemId]: { ...current[itemId], [field]: value },
    }));
  }
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
          <Badge tone={editable ? "warning" : "success"}>
            {statusLabel(order.status)}
          </Badge>
        }
        actions={
          editable && <AddPurchaseOrderItemForm orderId={id} onAdded={reload} />
        }
      />
      <ul className="flex flex-col gap-3 md:hidden">
        {order.items.map((item) => {
          const removed = !!item.removed_at;
          return (
            <li key={item.id} className={`rounded-app border border-border bg-surface p-4 ${removed ? "text-text-secondary" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <p className={`font-medium ${removed ? "line-through" : ""}`}>{item.product_name ?? item.description}</p>
                <div className="flex shrink-0 items-center gap-2">
                  {!item.product_id && <Badge tone="warning">Pendiente de alta</Badge>}
                  {editable && !removed && <Button variant="ghost" iconOnly size="sm" aria-label="Quitar ítem" title="Quitar ítem" className="-mt-1 text-error hover:bg-error/10" onClick={() => { setRemoving(item); setReason(""); setFormError(null); }}><IconTrash className="size-4" /></Button>}
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-4 gap-2 text-xs">
                <div><dt className="text-text-secondary">Solicitada</dt><dd className="num">{item.quantity}</dd></div>
                <div><dt className="text-text-secondary">Recibida</dt><dd className="num">{item.received_quantity}</dd></div>
                <div><dt className="text-text-secondary">Costo</dt><dd className="num">{formatMoney(item.unit_cost)}</dd></div>
                <div><dt className="text-text-secondary">Subtotal</dt><dd className="num font-medium">{formatMoney(item.subtotal)}</dd></div>
              </dl>
              {item.non_delivery_reason && <p className="mt-2 text-xs">Motivo: {item.non_delivery_reason}</p>}
            </li>
          );
        })}
      </ul>
      <div className="hidden md:block">
      <Table>
        <thead>
          <tr>
            <Th>Producto</Th>
            <Th className="text-right">Solicitada</Th>
            <Th className="text-right">Recibida</Th>
            <Th>Diferencias</Th>
            <Th>Costo</Th>
            <Th>Subtotal</Th>
            {editable && <Th>Acción</Th>}
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => {
            const removed = !!item.removed_at;
            return (
              <tr
                key={item.id}
                className={removed ? "text-text-secondary line-through" : ""}
              >
                <Td>
                  {item.product_name ?? item.description}
                  {!item.product_id && (
                    <Badge className="ml-2" tone="warning">
                      Pendiente de alta
                    </Badge>
                  )}
                  {removed && (
                    <p className="mt-1 text-xs no-underline">
                      Motivo: {item.removal_reason}
                    </p>
                  )}
                </Td>
                <Td className="num text-right">{item.quantity}</Td>
                <Td className="num text-right">{item.received_quantity}</Td>
                <Td>
                  {item.non_delivery_reason ? (
                    <p className="text-xs no-underline">
                      Motivo: {item.non_delivery_reason}
                    </p>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </Td>
                <Td className="num">{formatMoney(item.unit_cost)}</Td>
                <Td className="num">{formatMoney(item.subtotal)}</Td>
                {editable && (
                  <Td>
                    {!removed && (
                      <Button
                        variant="ghost"
                        iconOnly
                        size="sm"
                        aria-label="Quitar ítem"
                        title="Quitar ítem"
                        className="text-error hover:bg-error/10"
                        onClick={() => {
                          setRemoving(item);
                          setReason("");
                          setFormError(null);
                        }}
                      ><IconTrash className="size-4" /></Button>
                    )}
                  </Td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
      </div>
      <Card className="flex items-center justify-between">
        <span className="font-medium">Total</span>
        <span className="num text-lg font-semibold">
          {formatMoney(order.total)}
        </span>
      </Card>
      {!editable && order.status === "RECEIVED" && (
        <Card>
          <h2 className="font-medium">Recepción registrada</h2>
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
      {editable && (
        <div className="flex justify-end">
          <Button
            onClick={openReception}
          >
            Confirmar recepción
          </Button>
        </div>
      )}
      <Dialog
        open={receiveOpen}
        title="Confirmar recepción"
        onClose={() => setReceiveOpen(false)}
        dismissible={!pending}
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary">
            Se registrarán tu usuario, la fecha y hora, las cantidades entregadas,
            los movimientos de stock y el cierre del pedido.
          </p>
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-text-secondary">Entrega real</h2>
            {activeItems.map((item) => {
              const draft = receptionItems[item.id] ?? { quantity: "", reason: "" };
              return (
                <div key={item.id} className="grid gap-3 rounded-app border border-border p-3 md:grid-cols-[minmax(0,1fr)_9rem]">
                  <div>
                    <p className="font-medium">{item.product_name ?? item.description}</p>
                    <p className="text-sm text-text-secondary">Solicitada: {item.quantity}</p>
                  </div>
                  <Input
                    label="Cantidad recibida"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={draft.quantity}
                    onChange={(event) => updateReceptionItem(item.id, "quantity", event.target.value)}
                  />
                  <Input
                    label="Motivo de diferencia (opcional)"
                    value={draft.reason}
                    onChange={(event) => updateReceptionItem(item.id, "reason", event.target.value)}
                    className="md:col-span-2"
                  />
                </div>
              );
            })}
          </div>
          <Select
            label="Método de pago"
            value={payment}
            onChange={(e) =>
              setPayment(e.target.value as keyof typeof paymentLabels | "")
            }
          >
            <option value="">Elegí un método</option>
            {Object.entries(paymentLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {formError && (
            <p role="alert" className="text-sm text-error">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setReceiveOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={receive} disabled={!payment} pending={pending}>
              Confirmar recepción
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={removing !== null}
        title="Quitar ítem"
        onClose={() => setRemoving(null)}
        dismissible={!pending}
      >
        <div className="flex flex-col gap-5">
          <Input
            label="Motivo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={formError ?? undefined}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setRemoving(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={remove}
              disabled={!reason.trim()}
              pending={pending}
            >
              Quitar ítem
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
