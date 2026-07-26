"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Badge, pastelFor } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { api } from "@/lib/api"
import { useLoad } from "@/lib/useLoad";
import { formatMoney } from "@/lib/money";
import { Category, ProductList } from "@/lib/types";

export function ProductsView() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const fetcher = useCallback(
    () =>
      Promise.all([
        api<ProductList>("/products"),
        api<Category[]>("/categories"),
      ]),
    [],
  );
  const { data, error, reload } = useLoad(fetcher);
  const products = data ? data[0].products : null;
  const categories = useMemo(() => data?.[1] ?? [], [data]);

  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const filtered = useMemo(() => {
    if (!products) return [];
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (term) {
        const haystack = `${p.name} ${p.sku} ${p.barcode ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (categoryFilter && p.category_id !== categoryFilter) return false;
      if (activeFilter === "active" && !p.active) return false;
      if (activeFilter === "inactive" && p.active) return false;
      return true;
    });
  }, [products, search, categoryFilter, activeFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Productos</h1>
        <Link href="/products/new">
          <Button>Crear producto</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nombre, SKU o código de barras"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-64 flex-1"
        />
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-48"
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="w-40"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </Select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : products === null ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          message={
            products.length === 0
              ? "Todavía no hay productos. Creá el primero para empezar a vender."
              : "Ningún producto coincide con la búsqueda."
          }
          action={
            products.length === 0 ? (
              <Link href="/products/new">
                <Button>Crear producto</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Nombre</Th>
              <Th>SKU</Th>
              <Th>Código de barras</Th>
              <Th>Categoría</Th>
              <Th className="text-right">Precio</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-surface-2">
                <Td>
                  <Link
                    href={`/products/${p.id}`}
                    className="font-medium text-primary hover:text-primary-hover"
                  >
                    {p.name}
                  </Link>
                </Td>
                <Td className="data">{p.sku}</Td>
                <Td className="data">{p.barcode ?? "—"}</Td>
                <Td>
                  <Badge tone={pastelFor(p.category_id)}>
                    {categoryName.get(p.category_id) ?? p.category_id}
                  </Badge>
                </Td>
                <Td className="data text-right">{formatMoney(p.price)}</Td>
                <Td>
                  {p.active ? (
                    <Badge tone="success">Activo</Badge>
                  ) : (
                    <Badge tone="neutral">Inactivo</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
