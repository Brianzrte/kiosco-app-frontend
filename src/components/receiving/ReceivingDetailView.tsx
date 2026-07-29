"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Input";
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
export function ReceivingDetailView({ id }: { id: string }) {
  const toast = useToast();
  const fetcher = useCallback(
    () => api<PurchaseOrder>(`/purchase-orders/${id}`),
    [id],
  );
  const { data: order, error, reload } = useLoad(fetcher);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [payment, setPayment] = useState<keyof typeof paymentLabels | "">("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<PurchaseOrderItem | null>(null);
  const [reason, setReason] = useState("");
  async function receive() {
    if (!payment) return;
    setPending(true);
    setFormError(null);
    try {
      await api(`/purchase-orders/${id}/receive`, {
        method: "POST",
        body: { payment_method: payment },
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
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/receiving"
        className="text-sm font-medium text-primary hover:text-primary-hover"
      >
        ← Volver a recepción
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Pedido de {order.supplier_name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(
              new Date(order.ordered_at),
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={editable ? "warning" : "success"}>
            {statusLabel(order.status)}
          </Badge>
          {editable && <AddPurchaseOrderItemForm orderId={id} onAdded={reload} />}
        </div>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Producto</Th>
            <Th>Cantidad</Th>
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
                <Td className="num">{item.quantity}</Td>
                <Td className="num">{formatMoney(item.unit_cost)}</Td>
                <Td className="num">{formatMoney(item.subtotal)}</Td>
                {editable && (
                  <Td>
                    {!removed && (
                      <Button
                        variant="danger"
                        onClick={() => {
                          setRemoving(item);
                          setReason("");
                          setFormError(null);
                        }}
                      >
                        Quitar
                      </Button>
                    )}
                  </Td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
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
            onClick={() => {
              setReceiveOpen(true);
              setFormError(null);
            }}
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
            Se registrarán tu usuario, la fecha y hora de recepción.
          </p>
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
