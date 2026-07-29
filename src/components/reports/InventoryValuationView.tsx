"use client";

import Link from "next/link";
import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { formatMoney } from "@/lib/money";

type ValuationGroup = {
  total_cost: string;
  total_sale_value: string;
  product_count: number;
};

type ValuationResponse = {
  active: ValuationGroup;
  inactive: ValuationGroup;
  total: ValuationGroup;
};

const GROUPS: { key: keyof ValuationResponse; title: string }[] = [
  { key: "active", title: "Productos activos" },
  { key: "inactive", title: "Productos inactivos" },
  { key: "total", title: "Total" },
];

export function InventoryValuationView() {
  const fetcher = useCallback(() => api<ValuationResponse>("/inventory/valuation"), []);
  const { data, error, reload } = useLoad(fetcher);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/reports"
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          ← Volver a reportes
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Valorización de inventario</h1>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data === null ? (
        <ListSkeleton rows={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {GROUPS.map(({ key, title }) => {
            const group = data[key];
            return (
              <Card key={key}>
                <p className="text-sm font-medium text-text-secondary">
                  {title}
                </p>
                <p className="mt-3 text-sm text-text-secondary">
                  Costo total
                </p>
                <p className="num text-2xl font-semibold text-text-primary">
                  {formatMoney(group.total_cost)}
                </p>
                <p className="mt-3 text-sm text-text-secondary">
                  Valor de venta total
                </p>
                <p className="num text-2xl font-semibold text-text-primary">
                  {formatMoney(group.total_sale_value)}
                </p>
                <p className="num mt-3 text-sm text-text-secondary">
                  {group.product_count} producto
                  {group.product_count === 1 ? "" : "s"}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
