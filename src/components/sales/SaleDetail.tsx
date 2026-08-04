"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ReturnForm } from "@/components/returns/ReturnForm";
import { ReturnHistory } from "@/components/returns/ReturnHistory";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import {
  computeAvailability,
} from "@/lib/returns";
import { Return, ReturnList, Role, Sale, SaleStatus, User } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

const paymentMethodLabels: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: SaleStatus) {
  return status === "confirmed" ? "Confirmada" : "Borrador";
}

function itemQuantityLabel(item: Sale["items"][number]) {
  return item.weight ? `${item.weight} kg` : String(item.quantity);
}

function itemPrice(item: Sale["items"][number]) {
  const calculated = item.weight ? item.calculated_subtotal : item.unit_price;
  const corrected = item.actual_price && item.actual_price !== calculated;
  if (!corrected) return <>{formatMoney(item.actual_price ?? calculated)}</>;
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2">
      <s
        className="text-error"
        aria-label="Precio calculado, reemplazado por precio real"
      >
        {formatMoney(calculated)}
      </s>
      <span>{formatMoney(item.actual_price!)}</span>
      <span className="sr-only">Precio calculado reemplazado por precio real</span>
    </span>
  );
}

export function SaleDetail({ id, roles }: { id: string; roles: Role[] }) {
  const [returnFormOpen, setReturnFormOpen] = useState(false);

  const fetcher = useCallback(() => api<Sale>(`/sales/${id}`), [id]);
  const { data: sale, error, reload, refresh } = useLoad(fetcher, { pollMs: 30_000 });

  const returnsFetcher = useCallback(
    () => api<ReturnList>(`/sales/${id}/returns`),
    [id],
  );
  const {
    data: returnsData,
    error: returnsError,
    reload: reloadReturns,
    refresh: refreshReturns,
  } = useLoad(returnsFetcher, { pollMs: 30_000 });
  const returns: Return[] | null = returnsData?.returns ?? null;

  // Best-effort username resolution for the "acting user" column: /users is
  // admin-only, so a cashier never requests it — ReturnHistory falls back
  // to the raw id for that role, never an invented name.
  const usersFetcher = useCallback(() => {
    if (!roles.includes("admin")) return Promise.resolve<User[]>([]);
    return api<{ users: User[]; total: number }>("/users?limit=100").then(
      (res) => res.users,
    );
  }, [roles]);
  const { data: users } = useLoad(usersFetcher);
  const usersById = new Map(
    (users ?? []).map((user) => [user.id, user.username]),
  );

  const canRegisterReturn =
    sale?.status === "confirmed" &&
    (roles.includes("admin") || roles.includes("cashier"));

  // The sale's total and payments are already net of returns. This remains a
  // visual mark over the original item snapshots, which stay immutable.
  // visual sobre los mismos ítems, tachado completo únicamente cuando no
  // queda nada vigente de esa línea — un parcial sigue siendo venta real.
  const availabilityByItemId = new Map(
    computeAvailability(sale?.items ?? [], returns ?? []).map((item) => [
      item.saleItemId,
      item,
    ]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/sales"
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          ← Volver al historial
        </Link>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : sale === null ? (
        <ListSkeleton rows={4} />
      ) : (
        <>
          <PageHeader
            title={
              sale.sale_number == null
                ? "Venta sin número"
                : `#${sale.sale_number}`
            }
            titleClassName="num"
            description={formatDate(
              sale.status === "confirmed"
                ? sale.confirmed_at!
                : sale.created_at,
            )}
            titleAdornment={
              <Badge tone={sale.status === "confirmed" ? "success" : "warning"}>
                {statusLabel(sale.status)}
              </Badge>
            }
            actions={
              canRegisterReturn && (
                <Button
                  variant="secondary"
                  onClick={() => setReturnFormOpen(true)}
                >
                  Registrar devolución
                </Button>
              )
            }
          />

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-stretch lg:gap-6">
          <section>
            <h2 className="mb-3 text-sm font-medium text-text-secondary">
              Ítems
            </h2>
            <ul className="flex flex-col gap-2 md:hidden">
              {sale.items.map((item) => {
                const availability = availabilityByItemId.get(item.id);
                const fullyReturned = !!availability && availability.alreadyReturned > 0 && availability.available === 0;
                const partiallyReturned = !!availability && availability.alreadyReturned > 0 && availability.available > 0;
                return (
                <li key={item.id} className="rounded-app border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                      <p className={`min-w-0 text-sm font-medium ${fullyReturned ? "text-text-secondary line-through decoration-error decoration-2" : ""}`}>{item.product_name}</p>
                      {fullyReturned && <Badge tone="error">Devuelto</Badge>}
                      {partiallyReturned && <Badge tone="error">{availability.alreadyReturned} de {itemQuantityLabel(item)} devuelto</Badge>}
                    </div>
                    <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div><dt className="text-text-secondary">{item.weight ? "Peso" : "Cantidad"}</dt><dd className="num">{itemQuantityLabel(item)}</dd></div>
                      <div><dt className="text-text-secondary">{item.weight ? "Precio cobrado" : "Precio unitario"}</dt><dd className="num">{itemPrice(item)}</dd></div>
                      <div><dt className="text-text-secondary">Subtotal</dt><dd className="num font-semibold">{formatMoney(item.subtotal)}</dd></div>
                    </dl>
                  </li>
                );
              })}
            </ul>
            <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th compact className="w-2/5">Producto</Th>
                  <Th compact className="text-right">Cantidad / peso</Th>
                  <Th compact className="text-right">Precio</Th>
                  <Th compact className="text-right">Subtotal</Th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => {
                  const availability = availabilityByItemId.get(item.id);
                  const fullyReturned =
                    !!availability &&
                    availability.alreadyReturned > 0 &&
                    availability.available === 0;
                  const partiallyReturned =
                    !!availability &&
                    availability.alreadyReturned > 0 &&
                    availability.available > 0;
                  const struck = fullyReturned
                    ? "text-text-secondary line-through decoration-error decoration-2"
                    : "";
                  return (
                    <tr key={item.id}>
                      <Td compact className={`font-medium ${struck}`}>
                        <span className="inline-flex flex-wrap items-center gap-2">
                          {item.product_name}
                          {fullyReturned && (
                            <Badge tone="error" className="no-underline">
                              Devuelto
                            </Badge>
                          )}
                          {partiallyReturned && (
                            <Badge tone="error" className="no-underline">
                              {availability.alreadyReturned} de {itemQuantityLabel(item)}{" "}
                              devuelto
                            </Badge>
                          )}
                        </span>
                      </Td>
                      <Td compact className={`num text-right ${struck}`}>
                        <span className="block">{itemQuantityLabel(item)}</span>
                      </Td>
                      <Td compact className={`num text-right ${struck}`}>
                        <span className="block">
                          {itemPrice(item)}
                        </span>
                      </Td>
                      <Td compact className={`num text-right font-medium ${struck}`}>
                        <span className="block font-semibold">
                          {formatMoney(item.subtotal)}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            </div>
          </section>

          <aside className="flex flex-col gap-4 lg:h-full">
          <section>
            <h2 className="mb-3 text-sm font-medium text-text-secondary">
              Detalle
            </h2>
            <dl className="overflow-hidden rounded-app border border-border bg-surface shadow-soft">
              <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
                <dt className="text-sm text-text-secondary">Medio de pago</dt>
                <dd className="text-right text-sm font-medium">
                  {sale.payments.length === 0 ? (
                    <span className="text-text-secondary">Sin pago registrado</span>
                  ) : (
                    sale.payments.map((payment) => (
                      <div key={payment.id}>
                        {paymentMethodLabels[payment.method] ?? payment.method}
                        {sale.payments.length > 1 && (
                          <span className="num ml-2 font-normal text-text-secondary">
                            {formatMoney(payment.amount)}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-text-secondary">Cantidad de productos</dt>
                <dd className="num text-sm font-medium">{sale.items.length}</dd>
              </div>
              {returns && returns.length > 0 && sale.confirmed_at && sale.updated_at !== sale.confirmed_at && (
                <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
                  <dt className="text-sm text-text-secondary">Modificada por devolución</dt>
                  <dd className="text-right text-sm font-medium">
                    {formatDate(sale.updated_at)}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <div className="mt-auto flex flex-col gap-2 rounded-app bg-primary-hover px-4 py-3 text-text-inverse">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <span className="num text-xl font-semibold">
                {formatMoney(sale.total)}
              </span>
            </div>
          </div>
          </aside>
          </div>

          {sale.status === "confirmed" &&
            (returnsError || (returns && returns.length > 0)) && (
              <ReturnHistory
                returns={returns}
                saleItems={sale.items}
                error={returnsError}
                reload={reloadReturns}
                usersById={usersById}
              />
            )}

          <Dialog
            open={returnFormOpen}
            title="Registrar devolución"
            onClose={() => setReturnFormOpen(false)}
            className="!max-h-[calc(100dvh-4rem)] !max-w-4xl"
            contentClassName="!p-4 sm:!p-6"
          >
            {returnFormOpen && (
              <ReturnForm
                saleId={sale.id}
                items={sale.items}
                payments={sale.payments}
                returns={returns ?? []}
                onRegistered={() => {
                  setReturnFormOpen(false);
                  refresh();
                  refreshReturns();
                }}
                onReloadAvailability={reloadReturns}
                onClose={() => setReturnFormOpen(false)}
              />
            )}
          </Dialog>
        </>
      )}
    </div>
  );
}
