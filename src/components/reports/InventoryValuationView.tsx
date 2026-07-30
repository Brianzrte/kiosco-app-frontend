"use client";

import Link from "next/link";
import { useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, ListSkeleton } from "@/components/ui/states";
import { StatCard } from "@/components/ui/StatCard";
import { IconBox, IconCash, IconChart } from "@/components/ui/icons";
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

const valuationMetrics = (group: ValuationGroup) => [
  {
    label: "Costo total",
    value: formatMoney(group.total_cost),
    icon: <IconCash className="size-4.5" />,
  },
  {
    label: "Valor de venta total",
    value: formatMoney(group.total_sale_value),
    icon: <IconChart className="size-4.5" />,
  },
  {
    label: "Productos",
    value: String(group.product_count),
    icon: <IconBox className="size-4.5" />,
  },
];

export function InventoryValuationView() {
  const fetcher = useCallback(
    () => api<ValuationResponse>("/inventory/valuation"),
    [],
  );
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

      <PageHeader title="Valorización de inventario" />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data === null ? (
        <ListSkeleton rows={3} />
      ) : (
        <div className="grid gap-6">
          {GROUPS.map(({ key, title }) => {
            const group = data[key];
            return (
              <section key={key}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {title}
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {valuationMetrics(group).map((metric) => (
                    <StatCard key={metric.label} size="compact" {...metric} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
