"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, pastelFor } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CollapsibleFilters } from "@/components/ui/CollapsibleFilters";
import { CollapsibleSearch } from "@/components/ui/CollapsibleSearch";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { IconSearch } from "@/components/ui/icons";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { formatMoney } from "@/lib/money";
import { computeTotalPages } from "@/lib/pagination";
import {
  computeProductsPageSize,
  PRODUCTS_DEFAULT_PAGE_SIZE,
} from "@/lib/products";
import { CategoryList, ProductList } from "@/lib/types";

function productPrice(product: ProductList["products"][number]): string {
  return product.unit_type === "pesable"
    ? `${formatMoney(product.price_per_kg ?? "0.00")}/kg`
    : formatMoney(product.price);
}

// Desktop only needs the layout's bottom padding plus a small breathing room
// below the pager; reserving the larger mobile allowance leaves an avoidable
// blank band at the bottom of notebook viewports.
const RESERVED_BELOW_LIST_PX = 56;

export function ProductsView() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PRODUCTS_DEFAULT_PAGE_SIZE);
  const mobileListRef = useRef<HTMLUListElement>(null);
  const desktopListRef = useRef<HTMLDivElement>(null);

  const fetcher = useCallback(
    () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (search.trim()) params.set("q", search.trim());
      if (categoryFilter) params.set("category_id", categoryFilter);
      if (activeFilter) params.set("active", String(activeFilter === "active"));
      return Promise.all([
        api<ProductList>(`/products?${params.toString()}`),
        api<CategoryList>("/categories?limit=100").then(
          (res) => res.categories,
        ),
      ]);
    },
    [activeFilter, categoryFilter, page, pageSize, search],
  );
  const { data, error, reload } = useLoad(fetcher);
  const productPage = data?.[0] ?? null;
  const products = productPage?.products ?? null;
  const categories = useMemo(() => data?.[1] ?? [], [data]);

  useEffect(() => {
    if (!productPage || productPage.products.length === 0) return;
    const productsOnPage = productPage.products;

    function recompute() {
      const mobileRect = mobileListRef.current?.getBoundingClientRect();
      const desktopRect = desktopListRef.current?.getBoundingClientRect();
      const visibleRect =
        mobileRect && mobileRect.height > 0
          ? mobileRect
          : desktopRect && desktopRect.height > 0
            ? desktopRect
            : null;
      if (!visibleRect) return;

      const next = computeProductsPageSize({
        viewportHeight: window.innerHeight,
        listTop: visibleRect.top,
        rowHeight: visibleRect.height / productsOnPage.length,
        reservedBelow: RESERVED_BELOW_LIST_PX,
      });
      if (next === pageSize) return;
      setPageSize(next);
      setPage(1);
    }

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [pageSize, productPage]);

  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Productos"
        description={
          productPage
            ? `${productPage.total} producto${productPage.total === 1 ? "" : "s"} en el catálogo.`
            : undefined
        }
        actions={
          <Link href="/products/new">
            <Button>Crear producto</Button>
          </Link>
        }
      />

      <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 ${searchOpen || filtersOpen ? "gap-y-2" : "gap-y-0"} rounded-app border border-border bg-surface-subtle px-2 py-1.5 md:flex md:flex-wrap md:items-end md:gap-3 md:p-3`}>
        <CollapsibleSearch mobileGridLayout open={searchOpen} onOpenChange={(next) => { setSearchOpen(next); if (next) setFiltersOpen(false); }} label="Buscar producto">
          <Input icon={<IconSearch />} placeholder="Buscar por nombre, SKU o código de barras" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full sm:min-w-64 sm:flex-1" inputMode="search" />
        </CollapsibleSearch>
        <CollapsibleFilters mobileGridLayout open={filtersOpen} onOpenChange={(next) => { setFiltersOpen(next); if (next) setSearchOpen(false); }} className="justify-self-end" activeFilterCount={Number(Boolean(categoryFilter)) + Number(Boolean(activeFilter))}>
          <Select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="w-full sm:w-48" aria-label="Filtrar por categoría">
            <option value="">Todas las categorías</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }} className="w-full sm:w-40" aria-label="Filtrar por estado">
            <option value="">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </Select>
        </CollapsibleFilters>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : products === null ? (
        <ListSkeleton />
      ) : products.length === 0 ? (
        <EmptyState
          message={
            productPage?.total === 0
              ? "Todavía no hay productos. Creá el primero para empezar a vender."
              : "Ningún producto coincide con la búsqueda."
          }
          action={
            productPage?.total === 0 ? (
              <Link href="/products/new">
                <Button>Crear producto</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile: one card per product */}
          <ul ref={mobileListRef} className="flex flex-col gap-3 md:hidden">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/products/${p.id}`}
                  className="block rounded-app border border-border bg-surface p-4 shadow-soft transition-colors hover:border-border-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p title={p.name} className="min-w-0 flex-1 truncate font-medium text-text-primary">
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
                      {productPrice(p)}
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
          <div ref={desktopListRef} className="hidden md:block">
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
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover"
                  >
                    <Td>
                      {/* Black by default, like the row-as-button pattern in
                          UsersView/SuppliersView and the mobile card above —
                          the row's own hover:bg-surface-hover already signals
                          "clickable", so the name doesn't need link-blue on
                          top of it. */}
                      <Link
                        href={`/products/${p.id}`}
                        className="font-medium text-text-primary hover:text-primary"
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
                    <Td className="num text-right">{productPrice(p)}</Td>
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
          {productPage && computeTotalPages(productPage.total, pageSize) > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-text-secondary">Página {page} de {computeTotalPages(productPage.total, pageSize)} · {productPage.total} productos</p>
              <div className="flex gap-3">
                <Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
                <Button variant="secondary" disabled={page >= computeTotalPages(productPage.total, pageSize)} onClick={() => setPage((current) => current + 1)}>Siguiente</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
