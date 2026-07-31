"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CollapsibleFilters } from "@/components/ui/CollapsibleFilters";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { formatMoney } from "@/lib/money";
import { computePageSize, computeTotalPages } from "@/lib/pagination";
import { today } from "@/lib/reports";

type ProductReportItem = {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  stock: number;
  cost: string;
  price: string;
  margin: string;
  margin_estimated: boolean;
};

type ProductsReportResponse = { items: ProductReportItem[]; total: number };

type Sort = "best_selling" | "worst_selling";

const PAGE_SIZE = 20;
const ESTIMATED_MARGIN_EXPLANATION =
  "Margen estimado — incluye ventas sin costo histórico registrado, calculado con el costo actual del catálogo";

function firstOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function ProductsReportView() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [sort, setSort] = useState<Sort>("best_selling");
  const [page, setPage] = useState(1);

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

      <PageHeader title="Reporte de productos" />

      <CollapsibleFilters activeFilterCount={sort === "best_selling" ? 0 : 1}>
        <Input
          label="Desde"
          type="date"
          compact
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <Input
          label="Hasta"
          type="date"
          compact
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant={sort === "best_selling" ? "primary" : "secondary"}
            onClick={() => {
              setSort("best_selling");
              setPage(1);
            }}
          >
            Más vendidos
          </Button>
          <Button
            type="button"
            variant={sort === "worst_selling" ? "primary" : "secondary"}
            onClick={() => {
              setSort("worst_selling");
              setPage(1);
            }}
          >
            Menos vendidos
          </Button>
        </div>
      </CollapsibleFilters>

      <ProductsReportTable
        from={from}
        to={to}
        sort={sort}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}

function ProductsReportTable({
  from,
  to,
  sort,
  page,
  onPageChange,
}: {
  from: string;
  to: string;
  sort: Sort;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const mobileListRef = useRef<HTMLUListElement>(null);
  const desktopListRef = useRef<HTMLDivElement>(null);
  const fetcher = useCallback(
    () =>
      api<ProductsReportResponse>(
        `/reports/products?from=${from}&to=${to}&sort=${sort}&page=${page}&limit=${pageSize}`,
      ),
    [from, to, sort, page, pageSize],
  );
  const { data, error, reload } = useLoad(fetcher);

  useEffect(() => {
    if (!data || data.items.length === 0) return;
    const recompute = () => {
      const mobile = mobileListRef.current?.getBoundingClientRect();
      const desktop = desktopListRef.current?.getBoundingClientRect();
      const rect = mobile && mobile.height > 0 ? mobile : desktop;
      if (!rect) return;
      const next = computePageSize({ viewportHeight: window.innerHeight, listTop: rect.top, rowHeight: rect.height / data.items.length, reservedBelow: 56, min: 5, max: 15, fallback: PAGE_SIZE });
      if (next === pageSize) return;
      setPageSize(next);
      onPageChange(1);
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [data, onPageChange, pageSize]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (data === null) return <ListSkeleton rows={6} />;
  if (data.items.length === 0) {
    return (
      <EmptyState message="No hay productos para mostrar en el período seleccionado." />
    );
  }

  const totalPages = computeTotalPages(data.total, pageSize);
  return (
    <div className="flex flex-col gap-4">
      <ul ref={mobileListRef} className="flex flex-col gap-3 md:hidden">
        {data.items.map((item) => (
          <li key={item.product_id} className="rounded-app border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate font-medium">{item.product_name}</p>
              <p className="num shrink-0 font-medium">{formatMoney(item.price)}</p>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-text-secondary">Costo</dt><dd className="num">{formatMoney(item.cost)}</dd></div>
              <div><dt className="text-text-secondary">Vendidos</dt><dd className="num">{item.quantity_sold}</dd></div>
              <div className="col-span-2"><dt className="text-text-secondary">Margen</dt><dd className="num font-medium"><MarginValue item={item} /></dd></div>
            </dl>
          </li>
        ))}
      </ul>
      <div ref={desktopListRef} className="hidden md:block">
      <Table>
        <thead>
          <tr>
            <Th>Producto</Th>
            <Th className="text-right">Vendidos</Th>
            <Th className="text-right">Stock</Th>
            <Th className="text-right">Costo</Th>
            <Th className="text-right">Precio</Th>
            <Th className="text-right">Margen</Th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.product_id}>
              <Td>{item.product_name}</Td>
              <Td className="num text-right">{item.quantity_sold}</Td>
              <Td className="num text-right">{item.stock}</Td>
              <Td className="num text-right">{formatMoney(item.cost)}</Td>
              <Td className="num text-right">{formatMoney(item.price)}</Td>
              <Td className="num text-right font-medium">
                <MarginValue item={item} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Página {page} de {totalPages} · {data.total} productos
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MarginValue({ item }: { item: ProductReportItem }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2">
      {formatMoney(item.margin)}
      {item.margin_estimated && (
        <>
          <Badge
            tone="warning"
            title={ESTIMATED_MARGIN_EXPLANATION}
            aria-label={ESTIMATED_MARGIN_EXPLANATION}
          >
            Margen estimado
          </Badge>
          <span className="sr-only">{ESTIMATED_MARGIN_EXPLANATION}</span>
        </>
      )}
    </span>
  );
}
