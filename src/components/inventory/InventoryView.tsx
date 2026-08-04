"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CollapsibleFilters } from "@/components/ui/CollapsibleFilters";
import { CollapsibleSearch } from "@/components/ui/CollapsibleSearch";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { IconSearch } from "@/components/ui/icons";
import { api, ApiError } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import {
  buildMovementsQuery,
  buildStockQuery,
  computeInventoryPageSize,
  computeTotalPages,
  INVENTORY_DEFAULT_PAGE_SIZE,
  isRowLow,
  isDeepLinkedProductId,
  MOVEMENT_TYPE_LABELS,
  formatStockQuantity,
  isValidStockQuantityKg,
} from "@/lib/inventory";
import {
  CategoryList,
  MovementList,
  Product,
  Stock,
  StockList,
  StockListItem,
} from "@/lib/types";

// Space reserved below the list for the pagination bar (gap-6 + a "md"
// Button row) plus the page's own bottom padding (layout.tsx's md:pb-8) —
// so the fit calculation below doesn't push the pager itself off-screen.
const RESERVED_BELOW_LIST_PX = 100;

export function InventoryView({ canPlanStock }: { canPlanStock: boolean }) {
  const searchParams = useSearchParams();
  const deepLinkedProductId = searchParams.get("product_id");
  const [selectedItem, setSelectedItem] = useState<StockListItem | null>(null);
  const [deepLinkNotice, setDeepLinkNotice] = useState<string | null>(null);
  const [historyRequest, setHistoryRequest] = useState<{
    productId: string;
    nonce: number;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(INVENTORY_DEFAULT_PAGE_SIZE);
  const listRef = useRef<HTMLUListElement>(null);

  // Debounce: the backend does the filtering, so wait for the user to stop typing.
  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function selectCategory(value: string) {
    setCategoryId(value);
    setPage(1);
  }

  function selectLowStockOnly(value: boolean) {
    setLowStockOnly(value);
    setPage(1);
  }

  // limit=100: cubre el tamaño de kiosco hasta que exista paginación real
  // en este selector (add-frontend-users, sección 7.2).
  const categoriesFetcher = useCallback(() => {
    if (!canPlanStock) return Promise.resolve<CategoryList["categories"]>([]);
    return api<CategoryList>("/categories?limit=100").then(
      (res) => res.categories,
    );
  }, [canPlanStock]);
  const { data: categories } = useLoad(categoriesFetcher);

  const fetcher = useCallback(
    () =>
      api<StockList>(
        `/inventory/stock?${buildStockQuery({ search: term, categoryId, lowStockOnly, page, limit: pageSize })}`,
      ),
    [term, categoryId, lowStockOnly, page, pageSize],
  );
  const { data, error, reload } = useLoad(fetcher);
  const rows = data?.items ?? null;
  const total = data?.total ?? 0;

  // Fits the list to the screen instead of forcing a page scroll: measure
  // the already-rendered rows' real height (not a guessed constant) plus
  // how much viewport is left below them, then adjust how many rows the
  // *next* fetch asks for. Re-measures on resize too, so a shorter/taller
  // window (or rotating a tablet) adjusts the page size again.
  useEffect(() => {
    const el = listRef.current;
    if (!el || !rows || rows.length === 0) return;
    const rowCount = rows.length;

    function recompute() {
      const rect = el!.getBoundingClientRect();
      const next = computeInventoryPageSize({
        viewportHeight: window.innerHeight,
        listTop: rect.top,
        rowHeight: rect.height / rowCount,
        reservedBelow: RESERVED_BELOW_LIST_PX,
      });
      if (next === pageSize) return;
      // A pageSize change shifts what "page 1" even means (different
      // offset math) — always land back on page 1, never a stale slice.
      setPageSize(next);
      setPage(1);
    }

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [rows, pageSize]);

  // El backend decide qué es stock bajo (minimum_quantity > 0 AND quantity <
  // minimum_quantity); acá nunca se recalcula. En la vista "Todos" se pide
  // aparte el conjunto de IDs bajo mínimo (mismo filtro, sin paginar hasta
  // 100) para marcar la fila sin reimplementar la regla.
  const lowStockIdsFetcher = useCallback(() => {
    if (lowStockOnly)
      return Promise.resolve<StockList>({ items: [], total: 0 });
    return api<StockList>(
      `/inventory/stock?${buildStockQuery({ search: term, categoryId, lowStockOnly: true, page: 1, limit: 100 })}`,
    );
  }, [term, categoryId, lowStockOnly]);
  const { data: lowStockData } = useLoad(lowStockIdsFetcher);
  const lowStockIds = new Set(
    (lowStockData?.items ?? []).map((item) => item.product_id),
  );

  function isLow(item: StockListItem) {
    return isRowLow(
      item.initialized,
      lowStockOnly,
      lowStockIds.has(item.product_id),
    );
  }

  const totalPages = computeTotalPages(total, pageSize);

  const deepLinkedProductFetcher = useCallback(() => {
    if (!isDeepLinkedProductId(deepLinkedProductId)) {
      return Promise.resolve<Product | null>(null);
    }
    return api<Product>(
      `/products/${encodeURIComponent(deepLinkedProductId)}`,
    );
  }, [deepLinkedProductId]);
  const {
    data: deepLinkedProduct,
    error: deepLinkedProductError,
  } = useLoad(deepLinkedProductFetcher);

  useEffect(() => {
    if (!isDeepLinkedProductId(deepLinkedProductId)) return;
    queueMicrotask(() => {
      if (deepLinkedProductError) {
        setSelectedItem(null);
        setDeepLinkNotice(
          `No se pudo abrir el producto en Inventario. ${deepLinkedProductError.message}`,
        );
        return;
      }
      if (!deepLinkedProduct) return;
      setDeepLinkNotice(null);
      setSelectedItem({
        product_id: deepLinkedProduct.id,
        sku: deepLinkedProduct.sku,
        name: deepLinkedProduct.name,
        barcode: deepLinkedProduct.barcode,
        active: deepLinkedProduct.active,
        unit_type: deepLinkedProduct.unit_type ?? "unitario",
        initialized: false,
        quantity: 0,
        minimum_quantity: 0,
        updated_at: null,
      });
    });
  }, [deepLinkedProduct, deepLinkedProductError, deepLinkedProductId]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventario"
        description="Stock por producto, con mínimos y movimientos."
        actions={
          canPlanStock && (
            <Button
              variant="secondary"
              onClick={() =>
                setHistoryRequest({ productId: "", nonce: Date.now() })
              }
            >
              Historial de movimientos
            </Button>
          )
        }
      />
      {deepLinkNotice && (
        <p className="text-sm text-text-secondary" role="status">
          {deepLinkNotice}
        </p>
      )}

      <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 ${searchOpen || filtersOpen ? "gap-y-2" : "gap-y-0"} rounded-app border border-border bg-surface-subtle px-3 py-1.5 md:flex md:flex-row md:items-end md:gap-3 md:p-3`}>
        <CollapsibleSearch mobileGridLayout open={searchOpen} onOpenChange={(next) => { setSearchOpen(next); if (next) setFiltersOpen(false); }} label="Buscar producto">
          <Input icon={<IconSearch />} placeholder="Buscar por nombre, SKU o código de barras" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full max-w-xl flex-1" aria-label="Buscar producto" />
        </CollapsibleSearch>
        <CollapsibleFilters mobileGridLayout open={filtersOpen} onOpenChange={(next) => { setFiltersOpen(next); if (next) setSearchOpen(false); }} className="justify-self-end" activeFilterCount={Number(Boolean(categoryId)) + Number(lowStockOnly)}>
          {canPlanStock && <Select value={categoryId} onChange={(e) => selectCategory(e.target.value)} className="w-full max-w-none md:w-56" aria-label="Filtrar por categoría">
            <option value="">Todas las categorías</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>}
        {/* Segmented control: filled background marks the active option,
            same convention as ProductsReportView's sort buttons — a filter
            toggle, not a section-switching tab (see StockPanel's Ajustar/
            Mínimo tabs below, which use the underline convention instead). */}
        <div className="w-fit self-start overflow-hidden rounded-app border border-border">
          <button
            type="button"
            onClick={() => selectLowStockOnly(false)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              !lowStockOnly
                ? "bg-primary text-text-inverse"
                : "bg-surface text-text-primary hover:bg-surface-2"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => selectLowStockOnly(true)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              lowStockOnly
                ? "bg-primary text-text-inverse"
                : "bg-surface text-text-primary hover:bg-surface-2"
            }`}
          >
            Stock bajo
          </button>
        </div>
        </CollapsibleFilters>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          message={
            lowStockOnly
              ? canPlanStock
                ? "No hay productos por debajo de su mínimo. Si esperabas ver alguno, verificá que tenga un mínimo configurado en Ajustar → Mínimo."
                : "No hay productos por debajo de su mínimo."
              : term === ""
                ? "Todavía no hay productos. Crealos en Productos para gestionar su stock."
                : "Ningún producto coincide con la búsqueda."
          }
        />
      ) : (
        <>
          <ul
            ref={listRef}
            className="overflow-hidden rounded-app border border-border bg-surface shadow-soft"
          >
            {rows.map((item) => {
              const low = isLow(item);
              return (
                <li
                  key={item.product_id}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-3 last:border-b-0 ${
                    selectedItem?.product_id === item.product_id
                      ? "bg-primary-light/40"
                      : ""
                  }`}
                >
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="data text-xs text-text-secondary">
                      {item.sku}
                    </p>
                  </div>
                  {!item.initialized ? (
                    <Badge tone="neutral">Sin inicializar</Badge>
                  ) : (
                    <>
                      {low && <Badge tone="warning">Stock bajo</Badge>}
                      <p
                        className={`num w-24 text-right text-sm font-semibold ${
                          low ? "text-warning" : ""
                        }`}
                      >
                        {formatStockQuantity(item.quantity, item.unit_type)}
                        {low && (
                          <span className="ml-1 text-xs font-normal text-text-secondary">
                            mín. {formatStockQuantity(item.minimum_quantity, item.unit_type)}
                          </span>
                        )}
                      </p>
                    </>
                  )}
                  <div className="ml-auto flex shrink-0 gap-1">
                    {canPlanStock && (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() =>
                          setHistoryRequest({
                            productId: item.product_id,
                            nonce: Date.now(),
                          })
                        }
                      >
                        Historial
                      </Button>
                    )}
                    <Button
                      variant="secondary" size="sm"
                      onClick={() => setSelectedItem(item)}
                    >
                      {item.initialized ? "Ajustar" : "Inicializar"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Página {page} de {totalPages} · {total} productos
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!selectedItem}
        title="Gestionar stock"
        onClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <StockPanel
            key={selectedItem.product_id}
            productId={selectedItem.product_id}
            unitType={selectedItem.unit_type}
            isLow={isLow(selectedItem)}
            canPlanStock={canPlanStock}
            onChanged={reload}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </Dialog>

      <Dialog
        open={!!historyRequest}
        title="Historial de movimientos"
        onClose={() => setHistoryRequest(null)}
        className="max-w-4xl"
      >
        {historyRequest && (
          <MovementHistorySection
            key={historyRequest.nonce}
            initialProductId={historyRequest.productId}
          />
        )}
      </Dialog>
    </div>
  );
}

function StockPanel({
  productId,
  unitType,
  isLow,
  canPlanStock,
  onChanged,
  onClose,
}: {
  productId: string;
  unitType: "unitario" | "pesable";
  isLow: boolean;
  canPlanStock: boolean;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"adjust" | "minimum">("adjust");

  // stock: null inside the wrapper means "not initialized" (backend 404)
  const fetcher = useCallback(
    () =>
      api<Stock>(`/inventory/stock/${productId}`)
        .then((stock) => ({ stock: stock as Stock | null }))
        .catch((e: ApiError) => {
          if (e.status === 404) return { stock: null };
          throw e;
        }),
    [productId],
  );
  const { data, error, reload } = useLoad(fetcher);

  function refreshAll() {
    reload();
    onChanged();
  }

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <ListSkeleton rows={2} />;
  if (!data.stock)
    return (
      <InitializeStockForm
        productId={productId}
        unitType={unitType}
        onDone={() => {
          refreshAll();
          onClose();
        }}
      />
    );
  const stock = data.stock;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between rounded-app bg-surface-2 px-4 py-3">
        <div>
          <p className="text-sm text-text-secondary">Stock actual</p>
          <p
            className={`num text-2xl font-semibold ${isLow ? "text-warning" : ""}`}
          >
            {formatStockQuantity(stock.quantity, unitType)}
            <span className="ml-2 text-sm font-normal text-text-secondary">
              mín. {formatStockQuantity(stock.minimum_quantity, unitType)}
            </span>
          </p>
        </div>
        {isLow && <Badge tone="warning">Stock bajo</Badge>}
      </div>

      {/* Underline tabs: switches between two content sections in the same
          panel, distinct from the "Todos"/"Stock bajo" segmented filter
          above — a section switcher and a filter toggle read differently on
          purpose, so they don't share an active-state style. */}
      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("adjust")}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            tab === "adjust"
              ? "border-b-2 border-primary text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Ajustar
        </button>
        {canPlanStock && (
          <button
            type="button"
            onClick={() => setTab("minimum")}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              tab === "minimum"
                ? "border-b-2 border-primary text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Mínimo
          </button>
        )}
      </div>

      {tab === "adjust" ? (
        <AdjustStockForm
          productId={productId}
          unitType={unitType}
          onDone={() => {
            refreshAll();
            onClose();
          }}
        />
      ) : canPlanStock ? (
        <SetMinimumForm
          productId={productId}
          currentMinimum={stock.minimum_quantity}
          unitType={unitType}
          onDone={refreshAll}
        />
      ) : null}
    </div>
  );
}

function InitializeStockForm({
  productId,
  unitType,
  onDone,
}: {
  productId: string;
  unitType: "unitario" | "pesable";
  onDone: () => void;
}) {
  const toast = useToast();
  const [quantity, setQuantity] = useState(
    unitType === "pesable" ? "0.000" : "0",
  );
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (unitType === "pesable" && !isValidStockQuantityKg(quantity, true)) {
      setFieldError("Ingresá una cantidad mayor o igual a cero con hasta tres decimales.");
      return;
    }
    setFieldError(null);
    setPending(true);
    try {
      await api("/inventory/stock", {
        method: "POST",
        body: {
          product_id: productId,
          quantity: unitType === "pesable" ? quantity : parseInt(quantity, 10),
          reason: reason.trim(),
        },
      });
      toast("success", "Stock inicializado");
      onDone();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-text-secondary">
        Este producto aún no tiene stock. Inicializalo para empezar a registrar
        movimientos.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label={
            unitType === "pesable" ? "Cantidad inicial (kg)" : "Cantidad inicial"
          }
          type="number"
          inputMode={unitType === "pesable" ? "decimal" : "numeric"}
          min={0}
          step={unitType === "pesable" ? "0.001" : "1"}
          placeholder={unitType === "pesable" ? "0.000" : undefined}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          error={fieldError ?? undefined}
        />
        {unitType === "pesable" && <p className="text-sm text-text-secondary">Ingresá los kilogramos con hasta tres decimales.</p>}
        <Input
          label="Motivo"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Carga inicial de mercadería"
          required
        />
        {error && <p className="text-sm text-error">{error}</p>}
        <Button type="submit" pending={pending}>
          {pending ? "Inicializando…" : "Inicializar stock"}
        </Button>
      </form>
    </div>
  );
}

function AdjustStockForm({
  productId,
  unitType,
  onDone,
}: {
  productId: string;
  unitType: "unitario" | "pesable";
  onDone: () => void;
}) {
  const toast = useToast();
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason.trim()) return;
    setError(null);
    if (unitType === "pesable" && !isValidStockQuantityKg(quantity, false)) {
      setFieldError("Ingresá una cantidad mayor a cero con hasta tres decimales.");
      return;
    }
    setFieldError(null);
    setPending(true);
    const amount = unitType === "pesable" ? quantity : parseInt(quantity, 10);
    try {
      await api(`/inventory/stock/${productId}/adjust`, {
        method: "POST",
        body: {
          quantity_delta: direction === "in" ? amount : unitType === "pesable" ? `-${amount}` : -amount,
          reason: reason.trim(),
        },
      });
      toast("success", "Ajuste registrado");
      setQuantity("");
      setReason("");
      onDone();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo"
            value={direction}
            onChange={(e) => setDirection(e.target.value as "in" | "out")}
          >
            <option value="in">Entrada (+)</option>
            <option value="out">Salida (−)</option>
          </Select>
          <Input
            label={unitType === "pesable" ? "Cantidad (kg)" : "Cantidad"}
            type="number"
            inputMode={unitType === "pesable" ? "decimal" : "numeric"}
            min={1}
            step={unitType === "pesable" ? "0.001" : "1"}
            placeholder={unitType === "pesable" ? "0.000" : undefined}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            error={fieldError ?? undefined}
          />
        </div>
        {unitType === "pesable" && <p className="text-sm text-text-secondary">Ingresá los kilogramos con hasta tres decimales.</p>}
        <Input
          label="Motivo (obligatorio)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Rotura, vencimiento, recuento…"
          required
        />
        {error && <p className="text-sm text-error">{error}</p>}
        <Button
          type="submit"
          disabled={!reason.trim() || !quantity}
          pending={pending}
        >
          {pending ? "Registrando…" : "Registrar ajuste"}
        </Button>
      </form>
    </div>
  );
}

function SetMinimumForm({
  productId,
  currentMinimum,
  unitType,
  onDone,
}: {
  productId: string;
  currentMinimum: number;
  unitType: "unitario" | "pesable";
  onDone: () => void;
}) {
  const toast = useToast();
  const [value, setValue] = useState(String(currentMinimum));
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const valid = unitType === "pesable"
      ? isValidStockQuantityKg(value, true)
      : Number.isInteger(parseInt(value, 10)) && parseInt(value, 10) >= 0;
    if (!valid) {
      setFieldError(unitType === "pesable" ? "Ingresá una cantidad mayor o igual a cero con hasta tres decimales." : "Ingresá un número entero mayor o igual a 0.");
      return;
    }
    setFieldError(null);
    setPending(true);
    try {
      await api(`/inventory/stock/${productId}/minimum`, {
        method: "PATCH",
        body: { minimum_quantity: unitType === "pesable" ? value : parseInt(value, 10) },
      });
      toast("success", "Mínimo actualizado");
      onDone();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Debajo de este número el producto aparece como stock bajo.{" "}
        <strong className="font-medium text-text-primary">
          0 desactiva la alerta.
        </strong>{" "}
        No requiere motivo: no mueve mercadería.
      </p>
      <Input
        label="Cantidad mínima"
        type="number"
        inputMode={unitType === "pesable" ? "decimal" : "numeric"}
        min={0}
        step={unitType === "pesable" ? "0.001" : "1"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={fieldError ?? undefined}
        required
      />
      {unitType === "pesable" && <p className="text-sm text-text-secondary">Ingresá los kilogramos con hasta tres decimales.</p>}
      {error && <p className="text-sm text-error">{error}</p>}
      <Button type="submit" pending={pending}>
        {pending ? "Guardando…" : "Guardar mínimo"}
      </Button>
    </form>
  );
}

function MovementHistorySection({
  initialProductId,
}: {
  initialProductId: string;
}) {
  const [productId, setProductId] = useState(initialProductId);
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const mobileListRef = useRef<HTMLUListElement>(null);
  const desktopListRef = useRef<HTMLDivElement>(null);

  function updateFilter(update: () => void) {
    update();
    setPage(1);
  }

  const productsFetcher = useCallback(
    () =>
      api<{ products: { id: string; name: string; sku: string }[] }>(
        "/products",
      ).then((list) => list.products),
    [],
  );
  const { data: products } = useLoad(productsFetcher);

  const fetcher = useCallback(
    () =>
      api<MovementList>(
        `/inventory/movements?${buildMovementsQuery({ productId, type, from, to, page, limit: pageSize })}`,
      ),
    [productId, type, from, to, page, pageSize],
  );
  const { data, error, reload } = useLoad(fetcher);
  const rows = data?.items ?? null;
  const totalPages = data ? computeTotalPages(data.total, pageSize) : 1;

  useEffect(() => {
    if (!data || data.items.length === 0) return;
    const recompute = () => {
      const mobile = mobileListRef.current?.getBoundingClientRect();
      const desktop = desktopListRef.current?.getBoundingClientRect();
      const rect = mobile && mobile.height > 0 ? mobile : desktop;
      if (!rect) return;
      const next = Math.min(15, Math.max(5, Math.floor((window.innerHeight - rect.top - 56) / (rect.height / data.items.length))));
      if (next === pageSize) return;
      setPageSize(next);
      setPage(1);
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [data, pageSize]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Select
          label="Producto"
          value={productId}
          onChange={(e) => updateFilter(() => setProductId(e.target.value))}
          className="w-full sm:max-w-64"
        >
          <option value="">Todos los productos</option>
          {(products ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </Select>
        <Select
          label="Tipo"
          value={type}
          onChange={(e) => updateFilter(() => setType(e.target.value))}
          className="w-full sm:max-w-56"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          label="Desde"
          type="date"
          compact
          value={from}
          onChange={(e) => updateFilter(() => setFrom(e.target.value))}
          className="w-full sm:w-auto"
        />
        <Input
          label="Hasta"
          type="date"
          compact
          value={to}
          onChange={(e) => updateFilter(() => setTo(e.target.value))}
          className="w-full sm:w-auto"
        />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : rows === null ? (
        <ListSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState message="No hay movimientos registrados con estos filtros." />
      ) : (
        <>
          <ul ref={mobileListRef} className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <li key={row.id} className="rounded-app border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.product_name}</p>
                    <p className="data text-xs text-text-secondary">
                      {new Date(row.created_at).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <Badge
                    tone={row.quantity_delta < 0 ? "error" : "success"}
                    className="shrink-0 whitespace-nowrap"
                  >
                    {MOVEMENT_TYPE_LABELS[row.type] ?? row.type}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-text-secondary">Cantidad</dt>
                    <dd className="num font-medium">
                      {formatStockQuantity(row.previous_quantity, row.unit_type)} → {formatStockQuantity(row.new_quantity, row.unit_type)} ({row.quantity_delta > 0 ? "+" : ""}{formatStockQuantity(row.quantity_delta, row.unit_type)})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">Usuario</dt>
                    <dd>{row.performed_by_username || "—"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-text-secondary">Motivo</dt>
                    <dd>{row.reason || "—"}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <div ref={desktopListRef} className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Producto</Th>
                  <Th>Tipo</Th>
                  <Th className="text-right">Cantidad</Th>
                  <Th>Motivo</Th>
                  <Th>Usuario</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <Td className="data">{new Date(row.created_at).toLocaleString("es-AR")}</Td>
                    <Td className="font-medium">{row.product_name}</Td>
                    <Td className="whitespace-nowrap">{MOVEMENT_TYPE_LABELS[row.type] ?? row.type}</Td>
                    <Td className={`num text-right ${row.quantity_delta < 0 ? "text-error" : "text-success"}`}>
                      {formatStockQuantity(row.previous_quantity, row.unit_type)} → {formatStockQuantity(row.new_quantity, row.unit_type)}
                      <span className="ml-2 text-xs text-text-secondary">({row.quantity_delta > 0 ? "+" : ""}{formatStockQuantity(row.quantity_delta, row.unit_type)})</span>
                    </Td>
                    <Td className="text-text-secondary">{row.reason || "—"}</Td>
                    <Td className="text-text-secondary">{row.performed_by_username || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
