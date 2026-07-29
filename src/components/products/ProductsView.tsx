"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Badge, pastelFor } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { IconSearch } from "@/components/ui/icons";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { formatMoney } from "@/lib/money";
import { CategoryList, ProductList } from "@/lib/types";

export function ProductsView() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  // limit=100: cubre el tamaño de kiosco hasta que exista paginación real
  // en el selector de categorías (add-frontend-users, sección 7.2).
  const fetcher = useCallback(
    () =>
      Promise.all([
        api<ProductList>("/products"),
        api<CategoryList>("/categories?limit=100").then(
          (res) => res.categories,
        ),
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
      <PageHeader
        title="Productos"
        description={
          products
            ? `${products.length} producto${products.length === 1 ? "" : "s"} en el catálogo.`
            : undefined
        }
        actions={
          <Link href="/products/new">
            <Button>Crear producto</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-app border border-border bg-surface-subtle p-3">
        <Input
          icon={<IconSearch />}
          placeholder="Buscar por nombre, SKU o código de barras"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:min-w-64 sm:flex-1"
          inputMode="search"
        />
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-48"
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
          className="w-full sm:w-40"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </Select>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : products === null ? (
        <ListSkeleton />
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
        <>
          {/* Mobile: one card per product */}
          <ul className="flex flex-col gap-3 md:hidden">
            {filtered.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/products/${p.id}`}
                  className="block rounded-app border border-border bg-surface p-4 shadow-soft transition-colors hover:border-border-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 font-medium text-text-primary">
                      {p.name}
                    </p>
                    <Badge tone={pastelFor(p.category_id)}>
                      {categoryName.get(p.category_id) ?? p.category_id}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="data min-w-0 truncate text-xs text-text-secondary">
                      {p.sku}
                      {p.barcode ? ` · ${p.barcode}` : ""}
                    </p>
                    <p className="num text-lg font-semibold">
                      {formatMoney(p.price)}
                    </p>
                  </div>
                  {!p.active && (
                    <Badge tone="neutral" className="mt-2">
                      Inactivo
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block">
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
                  <tr
                    key={p.id}
                    className="transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover"
                  >
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
                    <Td className="num text-right">{formatMoney(p.price)}</Td>
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
          </div>
        </>
      )}
    </div>
  );
}
