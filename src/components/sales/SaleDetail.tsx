"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ReturnForm } from "@/components/returns/ReturnForm";
import { ReturnHistory } from "@/components/returns/ReturnHistory";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import {
  computeAvailability,
  computeNetTotal,
  sumReturnedTotal,
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

export function SaleDetail({ id, roles }: { id: string; roles: Role[] }) {
  const [returnFormOpen, setReturnFormOpen] = useState(false);

  const fetcher = useCallback(() => api<Sale>(`/sales/${id}`), [id]);
  const { data: sale, error, reload } = useLoad(fetcher);

  const returnsFetcher = useCallback(
    () => api<ReturnList>(`/sales/${id}/returns`),
    [id],
  );
  const {
    data: returnsData,
    error: returnsError,
    reload: reloadReturns,
  } = useLoad(returnsFetcher);
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

  const hasReturns = !!returns && returns.length > 0;
  const returnedTotal = hasReturns ? sumReturnedTotal(returns) : null;
  const netTotal =
    sale && hasReturns ? computeNetTotal(sale.total, returns) : null;

  // La venta original nunca cambia (design.md): esto es sólo una marca
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

          <section>
            <h2 className="mb-3 text-sm font-medium text-text-secondary">
              Ítems
            </h2>
            <Table>
              <thead>
                <tr>
                  <Th className="w-2/5">Producto</Th>
                  <Th className="text-right">Cantidad</Th>
                  <Th className="text-right">Precio unitario</Th>
                  <Th className="text-right">Subtotal</Th>
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
                      <Td className={`font-medium ${struck}`}>
                        <span className="inline-flex flex-wrap items-center gap-2 py-2">
                          {item.product_name}
                          {fullyReturned && (
                            <Badge tone="error" className="no-underline">
                              Devuelto
                            </Badge>
                          )}
                          {partiallyReturned && (
                            <Badge tone="error" className="no-underline">
                              {availability.alreadyReturned} de {item.quantity}{" "}
                              devuelto
                            </Badge>
                          )}
                        </span>
                      </Td>
                      <Td className={`num text-right ${struck}`}>
                        <span className="block py-2">{item.quantity}</span>
                      </Td>
                      <Td className={`num text-right ${struck}`}>
                        <span className="block py-2">
                          {formatMoney(item.unit_price)}
                        </span>
                      </Td>
                      <Td className={`num text-right font-medium ${struck}`}>
                        <span className="block py-2">
                          {formatMoney(item.subtotal)}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium text-text-secondary">
              Pagos
            </h2>
            {sale.payments.length === 0 ? (
              <Card>
                <p className="text-sm text-text-secondary">
                  Todavía no se registró ningún pago para esta venta.
                </p>
              </Card>
            ) : (
              <ul className="overflow-hidden rounded-app border border-border bg-surface shadow-soft">
                {sale.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <span>
                      {paymentMethodLabels[payment.method] ?? payment.method}
                    </span>
                    {sale.payments.length > 1 && (
                      <span className="num font-medium">
                        {formatMoney(payment.amount)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-2 rounded-app bg-rose-strong px-4 py-3 text-text-inverse">
            {netTotal !== null ? (
              <>
                <div className="flex items-center justify-between text-sm text-text-inverse/80">
                  <span>Total facturado</span>
                  <span className="num line-through">
                    {formatMoney(sale.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-text-inverse/80">
                  <span>Devuelto</span>
                  <span className="num">− {formatMoney(returnedTotal!)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-text-inverse/20 pt-2">
                  <span className="text-sm font-medium">
                    Total neto de la venta
                  </span>
                  <span className="num text-xl font-semibold">
                    {formatMoney(netTotal)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total de la venta</span>
                <span className="num text-xl font-semibold">
                  {formatMoney(sale.total)}
                </span>
              </div>
            )}
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
          >
            {returnFormOpen && (
              <ReturnForm
                saleId={sale.id}
                items={sale.items}
                returns={returns ?? []}
                onRegistered={() => {
                  setReturnFormOpen(false);
                  reloadReturns();
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
