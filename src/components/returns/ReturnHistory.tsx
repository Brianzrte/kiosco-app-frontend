"use client";

import { Card } from "@/components/ui/Card";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Return, SaleItem } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Best-effort label: resolved to a username when the caller could fetch
 * /users (Admin), falls back to the raw id otherwise (Cashier can't list
 * users) — never an invented name. */
export function performedByLabel(
  performedBy: string,
  usersById: Map<string, string>,
) {
  return usersById.get(performedBy) ?? `Usuario ${performedBy.slice(0, 8)}`;
}

export function ReturnHistory({
  returns,
  saleItems,
  error,
  reload,
  usersById,
}: {
  returns: Return[] | null;
  saleItems: SaleItem[];
  error: ApiError | null;
  reload: () => void;
  usersById: Map<string, string>;
}) {
  const productNameBySaleItemId = new Map(
    saleItems.map((item) => [item.id, item.product_name]),
  );

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-text-secondary">
        Devoluciones
      </h2>
      {error ? (
        <Card>
          <ErrorState error={error} onRetry={reload} />
        </Card>
      ) : returns === null ? (
        <ListSkeleton rows={2} />
      ) : returns.length === 0 ? (
        <Card>
          <EmptyState message="Todavía no se registró ninguna devolución para esta venta." />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {returns.map((ret) => (
            <div
              key={ret.id}
              className="overflow-hidden rounded-app border border-border bg-surface shadow-soft"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-surface-2 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {formatDate(ret.created_at)}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {performedByLabel(ret.performed_by, usersById)} ·{" "}
                    {ret.reason}
                  </p>
                </div>
                <p className="num text-lg font-semibold">
                  {formatMoney(ret.total_amount)}
                </p>
              </div>
              <ul className="flex flex-col gap-2 p-3 md:hidden">
                {ret.items.map((item) => (
                  <li key={item.id} className="rounded-app border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium">{productNameBySaleItemId.get(item.sale_item_id) ?? item.product_id}</span>
                      <span className="num font-medium">{formatMoney(item.subtotal)}</span>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">Cantidad: <span className="num">{item.quantity}</span></p>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Producto</Th>
                    <Th className="text-right">Cantidad</Th>
                    <Th className="text-right">Valor</Th>
                  </tr>
                </thead>
                <tbody>
                  {ret.items.map((item) => (
                    <tr key={item.id}>
                      <Td>
                        {productNameBySaleItemId.get(item.sale_item_id) ??
                          item.product_id}
                      </Td>
                      <Td className="num text-right">{item.quantity}</Td>
                      <Td className="num text-right">
                        {formatMoney(item.subtotal)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
