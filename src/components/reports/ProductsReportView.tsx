"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { formatMoney } from "@/lib/money";
import { computeTotalPages } from "@/lib/pagination";
import { today } from "@/lib/reports";

type ProductReportItem = {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  stock: number;
  cost: string;
  price: string;
  margin: string;
};

type ProductsReportResponse = { items: ProductReportItem[]; total: number };

type Sort = "best_selling" | "worst_selling";

const PAGE_SIZE = 20;

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

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Desde"
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <Input
          label="Hasta"
          type="date"
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
      </div>

      <ProductsReportTable
        key={`${from}-${to}-${sort}-${page}`}
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
  const fetcher = useCallback(
    () =>
      api<ProductsReportResponse>(
        `/reports/products?from=${from}&to=${to}&sort=${sort}&page=${page}&limit=${PAGE_SIZE}`,
      ),
    [from, to, sort, page],
  );
  const { data, error, reload } = useLoad(fetcher);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (data === null) return <ListSkeleton rows={6} />;
  if (data.items.length === 0) {
    return (
      <EmptyState message="No hay productos para mostrar en el período seleccionado." />
    );
  }

  const totalPages = computeTotalPages(data.total, PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
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
                {formatMoney(item.margin)}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

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
