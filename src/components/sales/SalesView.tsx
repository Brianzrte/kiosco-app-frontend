"use client";

import {
  FormEvent,
  KeyboardEvent,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigationRouter } from "@/components/shell/useNavigationRouter";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CollapsibleFilters } from "@/components/ui/CollapsibleFilters";
import { CollapsibleSearch } from "@/components/ui/CollapsibleSearch";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { AdminToolbar } from "@/components/ui/Workspace";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { IconSearch } from "@/components/ui/icons";
import { SummaryCards } from "@/components/sales/SummaryCards";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { computeTotalPages } from "@/lib/pagination";
import { hasAnyRole } from "@/lib/roleAccess";
import {
  computeSalesPageSize,
  paymentMethodTone,
  SALES_DEFAULT_PAGE_SIZE,
} from "@/lib/sales";
import { buildSummaryQuery, SalesSummaryByPaymentMethod, todayISO } from "@/lib/salesSummary";
import {
  OperationalSale,
  OperationalSalesList,
  Role,
  SaleStatus,
  User,
} from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

// The mobile shell reserves 96px for its bottom navigation. Together with
// this list's gap to the pagination bar and the bar's controls, 160px keeps
// the pager visible on both mobile and desktop layouts (whose bottom padding
// is smaller).
const RESERVED_BELOW_LIST_PX = 160;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: SaleStatus) {
  return status === "confirmed" ? "Confirmada" : "Borrador";
}

export function SalesView({ roles }: { roles: Role[] }) {
  const isAdmin = hasAnyRole(roles, ["admin"]);
  const isCashier = hasAnyRole(roles, ["cashier"]) && !isAdmin;
  const today = todayISO();

  const [status, setStatus] = useState<SaleStatus>("confirmed");
  const [cashierId, setCashierId] = useState("");
  // El Cajero arranca con el filtro de fecha en "hoy" (default de producto,
  // no restricción del backend); Admin ve el historial completo por defecto.
  const [from, setFrom] = useState(isCashier ? today : "");
  const [to, setTo] = useState(isCashier ? today : "");
  const [saleNumberInput, setSaleNumberInput] = useState("");
  const [saleNumber, setSaleNumber] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(SALES_DEFAULT_PAGE_SIZE);
  // Mobile-only: the number search starts collapsed behind a search-icon
  // trigger (see the form below) instead of a fixed field taking space
  // above the filters. Expanded automatically whenever a search is active
  // so the active query and "Limpiar búsqueda" stay visible.
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const saleNumberInputRef = useRef<HTMLInputElement>(null);
  const mobileListRef = useRef<HTMLUListElement>(null);
  const desktopListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchOpen) saleNumberInputRef.current?.focus();
  }, [searchOpen]);

  // GET /users es admin-only: el Cajero nunca lo pide (403 esperado). No
  // hace falta el selector de cajero para ese rol — hay uno solo, él mismo.
  // limit=100: alimenta el selector de cajero, no una lista paginada — a
  // escala kiosco (1-5 personas) siempre entra en una sola página.
  const usersFetcher = useCallback(() => {
    if (isCashier) return Promise.resolve<User[]>([]);
    return api<{ users: User[]; total: number }>("/users?limit=100").then(
      (res) => res.users,
    );
  }, [isCashier]);
  const { data: users } = useLoad(usersFetcher);
  const cashiers = useMemo(
    () => (users ?? []).filter((user) => user.roles.includes("cashier")),
    [users],
  );

  const fetcher = useCallback(() => {
    const params = new URLSearchParams({
      status,
      limit: String(pageSize),
      page: String(page),
    });
    if (cashierId) params.set("cashier_id", cashierId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (saleNumber) params.set("sale_number", saleNumber);
    return api<OperationalSalesList>(`/sales?${params.toString()}`);
  }, [cashierId, from, page, pageSize, saleNumber, status, to]);
  const { data, error, reload } = useLoad(fetcher);

  useEffect(() => {
    if (!data || data.items.length === 0) return;
    const rows = data.items;

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

      const next = computeSalesPageSize({
        viewportHeight: window.innerHeight,
        listTop: visibleRect.top,
        rowHeight: visibleRect.height / rows.length,
        reservedBelow: RESERVED_BELOW_LIST_PX,
      });
      if (next === pageSize) return;
      setPageSize(next);
      setPage(1);
    }

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [data, pageSize]);

  function updateStatus(nextStatus: SaleStatus) {
    setStatus(nextStatus);
    setPage(1);
  }

  function searchByNumber(event: FormEvent) {
    event.preventDefault();
    const value = saleNumberInput.trim();
    setSaleNumber(value);
    setStatus("confirmed");
    setCashierId("");
    setFrom(isCashier ? today : "");
    setTo(isCashier ? today : "");
    setPage(1);
  }

  function clearNumberSearch() {
    setSaleNumberInput("");
    setSaleNumber("");
    setSearchOpen(false);
    setPage(1);
  }

  const cashierNames = useMemo(
    () => new Map((users ?? []).map((user) => [user.id, user.username])),
    [users],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Historial de ventas"
        description="Consultá ventas confirmadas y borradores operativos."
        actions={null}
      />

      {isCashier ? <CashierTodaySummaryCards /> : <DailySummaryCards />}

      <AdminToolbar
        className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 ${searchOpen || filtersOpen ? "gap-y-2" : "gap-y-0"} px-2 py-1.5 md:flex md:gap-3 md:p-3`}
      >
      <CollapsibleSearch mobileGridLayout open={searchOpen} onOpenChange={(next) => { setSearchOpen(next); if (next) setFiltersOpen(false); }} label="Buscar por número de venta">
      <form onSubmit={searchByNumber} className="flex flex-wrap items-end gap-3">
        <Input
          ref={saleNumberInputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={saleNumberInput}
          onChange={(event) => setSaleNumberInput(event.target.value)}
          placeholder="Número de venta"
          label="Buscar"
          aria-label="Buscar por número de venta"
          className="w-full sm:min-w-52 sm:flex-1"
          endAdornment={<Button type="submit" variant="ghost" size="sm" iconOnly aria-label="Buscar venta" disabled={!saleNumberInput.trim()}><IconSearch className="size-4" /></Button>}
          compact
        />
        {saleNumber && (
          <Button type="button" variant="secondary" onClick={clearNumberSearch}>
            Limpiar búsqueda
          </Button>
        )}
      </form>
      </CollapsibleSearch>
      <CollapsibleFilters mobileGridLayout open={filtersOpen} onOpenChange={(next) => { setFiltersOpen(next); if (next) setSearchOpen(false); }} className="justify-self-end" activeFilterCount={Number(status !== "confirmed") + Number(Boolean(cashierId)) + Number(Boolean(from)) + Number(Boolean(to))}>
        <Select
          label="Estado"
          value={status}
          onChange={(event) => updateStatus(event.target.value as SaleStatus)}
          disabled={!!saleNumber}
          className="w-full sm:w-44"
        >
          <option value="confirmed">Confirmadas</option>
          <option value="draft">Borradores</option>
        </Select>
        {!isCashier && users !== null && (
          <Select
            label="Cajero"
            value={cashierId}
            onChange={(event) => {
              setCashierId(event.target.value);
              setPage(1);
            }}
            disabled={!!saleNumber}
            className="w-full sm:w-52"
          >
            <option value="">Todos los cajeros</option>
            {cashiers.map((cashier) => (
              <option key={cashier.id} value={cashier.id}>
                {cashier.username}
                {cashier.active ? "" : " (inactivo)"}
              </option>
            ))}
          </Select>
        )}
        {isCashier ? (
          <p className="pb-2 text-sm text-text-secondary">
            Fecha:{" "}
            {new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(
              new Date(`${today}T12:00:00`),
            )}
          </p>
        ) : (
          <>
            <Input
              label="Desde"
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              disabled={!!saleNumber}
              className="w-full sm:w-36"
              compact
            />
            <Input
              label="Hasta"
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              disabled={!!saleNumber}
              className="w-full sm:w-36"
              compact
            />
          </>
        )}
      </CollapsibleFilters>
      </AdminToolbar>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data === null ? (
        <ListSkeleton rows={6} />
      ) : data.items.length === 0 ? (
        <EmptyState
          message={
            saleNumber
              ? `No existe una venta con el número ${saleNumber}.`
              : status === "draft"
                ? "No hay borradores con los filtros seleccionados."
                : "No hay ventas confirmadas con los filtros seleccionados."
          }
        />
      ) : (
        <>
          <section aria-label="Ventas encontradas">
            <SalesTable
              rows={data.items}
              cashierNames={cashierNames}
              showCashier={!isCashier}
              mobileListRef={mobileListRef}
              desktopListRef={desktopListRef}
            />
          </section>
          {computeTotalPages(data.total, pageSize) > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-text-secondary">
                Página {page} de {computeTotalPages(data.total, pageSize)} ·{" "}
                {data.total} ventas
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
                  disabled={page >= computeTotalPages(data.total, pageSize)}
                  onClick={() =>
                    setPage((p) =>
                      Math.min(computeTotalPages(data.total, pageSize), p + 1),
                    )
                  }
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SalesTable({
  rows,
  cashierNames,
  showCashier,
  mobileListRef,
  desktopListRef,
}: {
  rows: OperationalSale[];
  cashierNames: Map<string, string>;
  showCashier: boolean;
  mobileListRef: RefObject<HTMLUListElement | null>;
  desktopListRef: RefObject<HTMLDivElement | null>;
}) {
  const router = useNavigationRouter();

  function openDetail(id: string) {
    router.push(`/sales/${id}`);
  }

  function handleRowKeyDown(event: KeyboardEvent, id: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail(id);
    }
  }

  return (
    <>
      <ul ref={mobileListRef} className="flex flex-col gap-3 md:hidden">
        {rows.map((sale) => (
          <li
            key={sale.id}
            onClick={() => openDetail(sale.id)}
            onKeyDown={(event) => handleRowKeyDown(event, sale.id)}
            tabIndex={0}
            role="button"
            className="flex cursor-pointer flex-col gap-3 rounded-app border border-border bg-surface p-4 shadow-soft transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:border-border-hover hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
          >
            <div className="flex items-center gap-2">
              <p className="num text-base font-semibold text-text-primary">
                {sale.sale_number == null ? "—" : `#${sale.sale_number}`}
              </p>
              {sale.payments.length === 0 ? (
                <span className="text-sm text-text-secondary">—</span>
              ) : (
                sale.payments.map((payment) => (
                  <Badge
                    key={payment.id}
                    tone={paymentMethodTone(payment.method)}
                  >
                    {paymentMethodLabels[payment.method]}
                  </Badge>
                ))
              )}
              <div className="ml-auto flex flex-wrap justify-end gap-1.5">
                {hasReturns(sale) && <SaleReturnsBadge />}
                <SaleStatusBadge status={sale.status} />
              </div>
            </div>
            {/* Total gets the visual weight — it's what a cashier/admin
                scans for first — set off by a divider from the secondary
                cajero/fecha column, which stays smaller and muted. */}
            <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                {showCashier && (
                  <p className="truncate text-sm text-text-secondary">
                    {cashierNames.get(sale.cashier_id) ??
                      "Cajero no disponible"}
                  </p>
                )}
                <p className="text-xs text-text-muted">
                  {sale.status === "confirmed" ? "Confirmada" : "Creada"}{" "}
                  {formatDate(
                    sale.status === "confirmed"
                      ? sale.confirmed_at!
                      : sale.created_at,
                  )}
                </p>
              </div>
              <p className="num shrink-0 text-lg font-semibold text-text-primary">
                {sale.total ? formatMoney(sale.total) : "Sin confirmar"}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div ref={desktopListRef} className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Número</Th>
              <Th>Estado</Th>
              <Th>Medio de pago</Th>
              {showCashier && <Th>Cajero</Th>}
              <Th>
                {rows[0]?.status === "confirmed" ? "Confirmada" : "Creada"}
              </Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((sale) => (
              <tr
                key={sale.id}
                onClick={() => openDetail(sale.id)}
                onKeyDown={(event) => handleRowKeyDown(event, sale.id)}
                tabIndex={0}
                role="button"
                className="cursor-pointer transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
              >
                <Td className="num font-medium">
                  {sale.sale_number == null ? "—" : `#${sale.sale_number}`}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <SaleStatusBadge status={sale.status} />
                    {hasReturns(sale) && <SaleReturnsBadge />}
                  </div>
                </Td>
                <Td>
                  {sale.payments.length === 0 ? (
                    "—"
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {sale.payments.map((payment) => (
                        <Badge
                          key={payment.id}
                          tone={paymentMethodTone(payment.method)}
                        >
                          {paymentMethodLabels[payment.method]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Td>
                {showCashier && (
                  <Td>
                    {cashierNames.get(sale.cashier_id) ??
                      "Cajero no disponible"}
                  </Td>
                )}
                <Td>
                  {formatDate(
                    sale.status === "confirmed"
                      ? sale.confirmed_at!
                      : sale.created_at,
                  )}
                </Td>
                <Td className="num text-right font-medium">
                  {sale.total ? formatMoney(sale.total) : "Sin confirmar"}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}

function hasReturns(sale: OperationalSale) {
  return sale.has_returns;
}

function SaleReturnsBadge() {
  return <Badge tone="error">Con devoluciones</Badge>;
}

function SaleStatusBadge({
  status,
  className = "",
}: {
  status: SaleStatus;
  className?: string;
}) {
  return (
    <Badge className={className} tone={status === "confirmed" ? "success" : "warning"}>
      {statusLabel(status)}
    </Badge>
  );
}

const paymentMethodLabels: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

/** Cards del día, siempre "hoy" — la propia agregación viene del backend. */
function DailySummaryCards() {
  const today = todayISO();
  const fetcher = useCallback(
    () =>
      api<SalesSummaryByPaymentMethod>(
        `/reports/sales/summary?${buildSummaryQuery({ from: today, to: today })}`,
      ),
    [today],
  );
  const { data, error, reload } = useLoad(fetcher, { pollMs: 30_000 });

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (data === null) return <ListSkeleton rows={2} />;

  return <SummaryCards data={data} salesLabel="Ventas hoy" />;
}

/** Resumen operativo propio; el backend fija usuario y día de negocio. */
function CashierTodaySummaryCards() {
  const fetcher = useCallback(
    () => api<SalesSummaryByPaymentMethod>("/sales/today-summary"),
    [],
  );
  const { data, error, reload } = useLoad(fetcher, { pollMs: 30_000 });

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (data === null) return <ListSkeleton rows={2} />;

  return <SummaryCards data={data} salesLabel="Ventas hoy" />;
}
