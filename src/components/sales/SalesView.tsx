"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import {
  IconCardPay,
  IconCart,
  IconCash,
  IconChart,
  IconTransfer,
} from "@/components/ui/icons";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { computeTotalPages } from "@/lib/pagination";
import { hasAnyRole } from "@/lib/roleAccess";
import {
  buildSummaryQuery,
  normalizeByPaymentMethod,
  SalesSummaryByPaymentMethod,
  todayISO,
} from "@/lib/salesSummary";
import {
  OperationalSale,
  OperationalSalesList,
  Role,
  SaleStatus,
  User,
} from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

const PAGE_SIZE = 20;

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
  const [cashClosingOpen, setCashClosingOpen] = useState(false);

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
      limit: String(PAGE_SIZE),
      page: String(page),
    });
    if (cashierId) params.set("cashier_id", cashierId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (saleNumber) params.set("sale_number", saleNumber);
    return api<OperationalSalesList>(`/sales?${params.toString()}`);
  }, [cashierId, from, page, saleNumber, status, to]);
  const { data, error, reload } = useLoad(fetcher);

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
        actions={
          !isCashier && (
            <Button
              variant="secondary"
              onClick={() => setCashClosingOpen((open) => !open)}
            >
              {cashClosingOpen ? "Cerrar" : "Cierre de caja"}
            </Button>
          )
        }
      />

      {isCashier ? <CashierTodaySummaryCards /> : <DailySummaryCards />}

      {!isCashier && cashClosingOpen && <CashClosingTool />}

      <form
        onSubmit={searchByNumber}
        className="flex flex-wrap items-end gap-3 rounded-app border border-border bg-surface p-4 shadow-soft"
      >
        <Input
          label="Buscar por número de venta"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={saleNumberInput}
          onChange={(event) => setSaleNumberInput(event.target.value)}
          placeholder="Ej. 124"
          className="w-full sm:min-w-52 sm:flex-1"
        />
        <Button type="submit" disabled={!saleNumberInput.trim()}>
          Buscar venta
        </Button>
        {saleNumber && (
          <Button type="button" variant="secondary" onClick={clearNumberSearch}>
            Limpiar búsqueda
          </Button>
        )}
      </form>

      <div className="flex flex-wrap items-end gap-3">
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
              className="w-full sm:w-44"
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
              className="w-full sm:w-44"
            />
          </>
        )}
      </div>

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
          <SalesTable
            rows={data.items}
            cashierNames={cashierNames}
            showCashier={!isCashier}
          />
          {computeTotalPages(data.total, PAGE_SIZE) > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-text-secondary">
                Página {page} de {computeTotalPages(data.total, PAGE_SIZE)} ·{" "}
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
                  disabled={page >= computeTotalPages(data.total, PAGE_SIZE)}
                  onClick={() =>
                    setPage((p) =>
                      Math.min(computeTotalPages(data.total, PAGE_SIZE), p + 1),
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
}: {
  rows: OperationalSale[];
  cashierNames: Map<string, string>;
  showCashier: boolean;
}) {
  const router = useRouter();

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
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((sale) => (
          <li
            key={sale.id}
            onClick={() => openDetail(sale.id)}
            onKeyDown={(event) => handleRowKeyDown(event, sale.id)}
            tabIndex={0}
            role="button"
            className="cursor-pointer rounded-app border border-border bg-surface p-4 shadow-soft transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:border-border-hover hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="num text-lg font-semibold">
                  {sale.sale_number == null ? "—" : `#${sale.sale_number}`}
                </p>
                {showCashier && (
                  <p className="mt-1 text-sm text-text-secondary">
                    {cashierNames.get(sale.cashier_id) ??
                      "Cajero no disponible"}
                  </p>
                )}
              </div>
              <SaleStatusBadge status={sale.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-text-secondary">
                  {sale.status === "confirmed" ? "Confirmada" : "Creada"}
                </dt>
                <dd>
                  {formatDate(
                    sale.status === "confirmed"
                      ? sale.confirmed_at!
                      : sale.created_at,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary">Total</dt>
                <dd className="num font-medium">
                  {sale.total ? formatMoney(sale.total) : "Sin confirmar"}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Número</Th>
              <Th>Estado</Th>
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
                  <SaleStatusBadge status={sale.status} />
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

function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return (
    <Badge tone={status === "confirmed" ? "success" : "warning"}>
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
  const { data, error, reload } = useLoad(fetcher);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (data === null) return <ListSkeleton rows={2} />;

  return <SummaryCards data={data} />;
}

/** Resumen operativo propio; el backend fija usuario y día de negocio. */
function CashierTodaySummaryCards() {
  const fetcher = useCallback(
    () => api<SalesSummaryByPaymentMethod>("/sales/today-summary"),
    [],
  );
  const { data, error, reload } = useLoad(fetcher);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (data === null) return <ListSkeleton rows={2} />;

  return <SummaryCards data={data} />;
}

function SummaryCards({ data }: { data: SalesSummaryByPaymentMethod }) {
  const byMethod = normalizeByPaymentMethod(data.by_payment_method);

  return (
    // Base grid-cols-2 (not 1): a phone-width stack of 5 full-height tiles
    // pushed the actual sales table below the fold — see the "compact"
    // StatCard note. The 5th tile spans both columns up to md (3-col),
    // where it would otherwise be the lone tile on its own row.
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5">
      <StatCard
        size="compact"
        label="Ventas hoy"
        value={data.total_sales}
        icon={<IconCart className="size-4.5" />}
      />
      <StatCard
        size="compact"
        label="Total facturado"
        value={formatMoney(data.total_amount)}
        icon={<IconChart className="size-4.5" />}
      />
      <StatCard
        size="compact"
        label="Efectivo"
        value={formatMoney(byMethod.CASH.totalAmount)}
        icon={<IconCash className="size-4.5" />}
      />
      <StatCard
        size="compact"
        label="Tarjeta"
        value={formatMoney(byMethod.CARD.totalAmount)}
        icon={<IconCardPay className="size-4.5" />}
      />
      <StatCard
        size="compact"
        className="col-span-2 md:col-span-1"
        label="Transferencia"
        value={formatMoney(byMethod.TRANSFER.totalAmount)}
        icon={<IconTransfer className="size-4.5" />}
      />
    </div>
  );
}

/** Mismo desglose que las cards, sobre un rango elegido — pensado para cerrar el turno. */
function CashClosingTool() {
  const today = todayISO();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const fetcher = useCallback(
    () =>
      api<SalesSummaryByPaymentMethod>(
        `/reports/sales/summary?${buildSummaryQuery({ from, to })}`,
      ),
    [from, to],
  );
  const { data, error, reload } = useLoad(fetcher);
  const byMethod = normalizeByPaymentMethod(data?.by_payment_method);

  return (
    <section className="flex flex-col gap-4 rounded-app border border-border bg-surface p-5 shadow-soft">
      <div>
        <h2 className="font-semibold">Cierre de caja</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Elegí un rango para ver cuánto se vendió y por qué medio de pago. Esto
          no afecta al POS: no hay ninguna acción que bloquee la venta.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          label="Desde"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          max={to}
          className="w-full sm:w-auto"
        />
        <Input
          label="Hasta"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          min={from}
          className="w-full sm:w-auto"
        />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data === null ? (
        <ListSkeleton rows={2} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between rounded-app bg-surface-2 px-4 py-3">
            <span className="text-sm text-text-secondary">
              {data.total_sales}{" "}
              {data.total_sales === 1
                ? "venta confirmada"
                : "ventas confirmadas"}
            </span>
            <span className="num text-xl font-semibold">
              {formatMoney(data.total_amount)}
            </span>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Método</Th>
                <Th className="text-right">Ventas</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {(["CASH", "CARD", "TRANSFER"] as const).map((method) => (
                <tr key={method}>
                  <Td>{paymentMethodLabels[method]}</Td>
                  <Td className="num text-right">
                    {byMethod[method].saleCount}
                  </Td>
                  <Td className="num text-right font-medium">
                    {formatMoney(byMethod[method].totalAmount)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </section>
  );
}
