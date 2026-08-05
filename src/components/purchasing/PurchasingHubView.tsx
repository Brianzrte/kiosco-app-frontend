"use client";

import Link from "next/link";
import { KeyboardEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { ListSkeleton } from "@/components/ui/states";
import { IconAlert, IconClock, IconPlus, IconTruck } from "@/components/ui/icons";
import { ApiError, api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import {
  buildPurchaseOrdersQuery,
  classifyPurchaseOrderSchedule,
  purchaseOrderScheduleBounds,
  PURCHASE_ORDER_PAGE_SIZE,
  purchaseOrderStatusLabel,
} from "@/lib/purchasing";
import { hasUncataloguedItems } from "@/lib/receiving";
import { hasAnyRole } from "@/lib/roleAccess";
import { BUSINESS_TIME_ZONE, todayISO } from "@/lib/salesSummary";
import { PurchaseOrderListItem, PurchaseOrdersList, Role, Supplier } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

function formatExpectedDate(expectedAt: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: BUSINESS_TIME_ZONE })
    .format(new Date(expectedAt))
    .replace(".", "");
}

function overdueDescription(expectedAt: string, today: string): string {
  const expected = expectedAt.slice(0, 10);
  const days = Math.max(1, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${expected}T00:00:00Z`)) / 86_400_000));
  return `objetivo venció hace ${days} ${days === 1 ? "día" : "días"}`;
}

function statusTone(status: PurchaseOrderListItem["status"]): Tone {
  if (status === "PENDING") return "warning";
  if (status === "RECEIVED") return "success";
  return "error";
}

function ScheduleError({ error, retry }: { error: ApiError; retry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-app border border-error/40 bg-error/10 p-4">
      <p className="text-sm text-(--color-error-strong)">{error.message || "No pudimos cargar los pedidos pendientes."}</p>
      <Button size="sm" variant="secondary" onClick={retry}>Reintentar</Button>
    </div>
  );
}

function EmptyScheduleState({
  kind,
  message,
}: {
  kind: "today" | "week";
  message: string;
}) {
  return (
    <div className="grid min-h-44 place-items-center rounded-app border border-border bg-surface-subtle p-5 text-center">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <div
          aria-hidden="true"
          className={`h-24 w-40 rounded-tight bg-[url('/purchasing-empty-states.png')] bg-[length:200%_auto] bg-no-repeat ${kind === "today" ? "bg-left" : "bg-right"}`}
        />
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
    </div>
  );
}

export function PurchasingHubView({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const canManage = hasAnyRole(roles, ["admin", "inventory"]);
  const today = todayISO();
  const [supplierId, setSupplierId] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const suppliersFetcher = useCallback(
    () => api<{ suppliers: Supplier[] }>("/suppliers").then((result) => result.suppliers),
    [],
  );
  const todayFetcher = useCallback(() => {
    const date = todayISO();
    const bounds = purchaseOrderScheduleBounds(date, targetDate, "today");
    if (!bounds) return Promise.resolve<PurchaseOrdersList>({ purchase_orders: [], page: 1, limit: PURCHASE_ORDER_PAGE_SIZE, total: 0 });
    const query = buildPurchaseOrdersQuery({ supplierId, from: "", to: "", status: "PENDING", page: 1, limit: PURCHASE_ORDER_PAGE_SIZE, ...bounds, orderByExpected: true });
    return api<PurchaseOrdersList>(`/purchase-orders?${query}`);
  }, [supplierId, targetDate]);
  const weekFetcher = useCallback(() => {
    const date = todayISO();
    const bounds = purchaseOrderScheduleBounds(date, targetDate, "week");
    if (!bounds) return Promise.resolve<PurchaseOrdersList>({ purchase_orders: [], page: 1, limit: PURCHASE_ORDER_PAGE_SIZE, total: 0 });
    const query = buildPurchaseOrdersQuery({ supplierId, from: "", to: "", status: "PENDING", page: 1, limit: PURCHASE_ORDER_PAGE_SIZE, ...bounds, orderByExpected: true });
    return api<PurchaseOrdersList>(`/purchase-orders?${query}`);
  }, [supplierId, targetDate]);
  const pendingCountFetcher = useCallback(() => api<PurchaseOrdersList>(`/purchase-orders?${buildPurchaseOrdersQuery({ supplierId: "", from: "", to: "", status: "PENDING", page: 1, limit: 1 })}`), []);
  const { data: suppliers } = useLoad(suppliersFetcher);
  const { data: todayOrders, error: todayError, reload: reloadToday } = useLoad(todayFetcher);
  const { data: weekOrders, error: weekError, reload: reloadWeek } = useLoad(weekFetcher);
  const { data: pendingCount } = useLoad(pendingCountFetcher);

  const openOrder = (id: string) => router.push(`/purchasing/${id}`);
  const onRowKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openOrder(id);
  };
  const overdueCount = todayOrders?.purchase_orders.filter((order) => classifyPurchaseOrderSchedule(order) === "overdue").length ?? 0;
  const todayCount = todayOrders?.purchase_orders.length ?? 0;
  const noPendingAtAll = pendingCount?.total === 0;

  return (
    <section className="flex flex-col gap-7">
      <PageHeader
        title="Compras y proveedores"
        description="Qué llega, qué recibir y con quién."
        compactMobile
        actions={<>
          <Button variant="secondary" onClick={() => router.push("/purchasing/history")}>Historial de pedidos</Button>
          {canManage && <Button variant="secondary" onClick={() => router.push("/purchasing/suppliers")}>Lista de proveedores</Button>}
          {canManage && <Button className="gap-1.5" onClick={() => router.push("/purchasing/new")}><IconPlus className="size-4" />Crear pedido</Button>}
        </>}
      />

      <section aria-labelledby="arrivals-today-heading">
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <h2 id="arrivals-today-heading" className="text-xl font-semibold tracking-tight text-text-primary">Qué llega hoy</h2>
          {todayOrders && <Badge tone={overdueCount ? "error" : "warning"}>{todayCount} {todayCount === 1 ? "pedido" : "pedidos"}{overdueCount ? `, ${overdueCount} atrasado${overdueCount === 1 ? "" : "s"}` : ""}</Badge>}
        </div>
        {todayError ? <ScheduleError error={todayError} retry={reloadToday} /> : !todayOrders ? <ListSkeleton rows={3} /> : todayOrders.purchase_orders.length === 0 ? (
          <EmptyScheduleState kind="today" message={noPendingAtAll ? "No hay pedidos pendientes por recibir." : "No hay pedidos para recibir hoy."} />
        ) : (
          <ul className="flex flex-col gap-3">
            {todayOrders.purchase_orders.map((order) => {
              const overdue = classifyPurchaseOrderSchedule(order) === "overdue";
              const description = overdue && order.expected_at ? overdueDescription(order.expected_at, today) : order.expected_at ? `Objetivo hoy, ${formatExpectedDate(order.expected_at)}` : "Sin fecha objetivo";
              return (
                <li key={order.id} role="button" tabIndex={0} onClick={() => openOrder(order.id)} onKeyDown={(event) => onRowKeyDown(event, order.id)} className={`flex cursor-pointer flex-col gap-4 rounded-app border bg-surface p-4 shadow-soft transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${overdue ? "border-error/40" : "border-border hover:border-border-hover"}`}>
                  <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-app bg-primary-light text-(--color-primary-strong)"><IconTruck className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="truncate text-base font-semibold text-text-primary">{order.supplier_name}</p>{hasUncataloguedItems(order) && <Badge tone="warning" icon={<IconAlert className="size-3" />}>Pendiente de alta</Badge>}</div>
                    <p className="mt-1 text-sm text-text-secondary">{description}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                    <p className="num shrink-0 whitespace-nowrap text-base font-semibold text-text-primary">{formatMoney(order.total)}</p>
                    <Badge tone={overdue ? "error" : statusTone(order.status)} icon={overdue ? <IconAlert className="size-3" /> : <IconClock className="size-3" />}>{overdue ? "Atrasado" : purchaseOrderStatusLabel(order.status)}</Badge>
                    <Button className="min-h-11 w-full sm:w-auto" onClick={(event) => { event.stopPropagation(); openOrder(order.id); }}>Recibir</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="arrivals-week-heading" className="border-t border-border pt-6">
        <div className="mb-3 flex items-center gap-2.5"><h2 id="arrivals-week-heading" className="text-base font-semibold text-text-secondary">Esta semana</h2></div>
        {weekError ? <ScheduleError error={weekError} retry={reloadWeek} /> : !weekOrders ? <ListSkeleton rows={3} /> : weekOrders.purchase_orders.length === 0 ? (
          <EmptyScheduleState kind="week" message={noPendingAtAll ? "Cuando crees un pedido, su fecha objetivo va a aparecer acá." : "No hay pedidos previstos para esta semana."} />
        ) : <>
          <ul className="divide-y divide-border md:hidden">
            {weekOrders.purchase_orders.map((order) => <li key={order.id} role="button" tabIndex={0} onClick={() => openOrder(order.id)} onKeyDown={(event) => onRowKeyDown(event, order.id)} className="cursor-pointer py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-text-primary">{order.supplier_name}</p>{hasUncataloguedItems(order) && <Badge tone="warning" icon={<IconAlert className="size-3" />}>Pendiente de alta</Badge>}</div><div className="mt-2 flex items-center justify-between gap-3 text-sm"><span className="text-text-secondary">Objetivo {order.expected_at ? formatExpectedDate(order.expected_at) : "Sin definir"}</span><span className="num font-medium">{formatMoney(order.total)}</span></div><Badge tone={statusTone(order.status)} icon={<IconClock className="size-3" />}>{purchaseOrderStatusLabel(order.status)}</Badge></li>)}
          </ul>
          <Table className="hidden md:block"><thead><tr><Th>Proveedor</Th><Th>Objetivo</Th><Th className="text-right">Total</Th><Th>Estado</Th></tr></thead><tbody>{weekOrders.purchase_orders.map((order) => <tr key={order.id} role="button" tabIndex={0} onClick={() => openOrder(order.id)} onKeyDown={(event) => onRowKeyDown(event, order.id)} className="cursor-pointer transition-colors hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><Td className="font-medium text-text-primary"><span className="flex flex-wrap items-center gap-2">{order.supplier_name}{hasUncataloguedItems(order) && <Badge tone="warning" icon={<IconAlert className="size-3" />}>Pendiente de alta</Badge>}</span></Td><Td className="text-text-secondary">{order.expected_at ? formatExpectedDate(order.expected_at) : "Sin definir"}</Td><Td className="num text-right font-medium">{formatMoney(order.total)}</Td><Td><Badge tone={statusTone(order.status)} icon={<IconClock className="size-3" />}>{purchaseOrderStatusLabel(order.status)}</Badge></Td></tr>)}</tbody></Table>
        </>}
        <Link href="/purchasing/history?status=PENDING" className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Ver todos los pedidos pendientes ({pendingCount?.total ?? "…"}) →</Link>
      </section>

      <div className="grid gap-4 border-t border-border pt-6 md:grid-cols-2">
        {canManage ? <Link href="/purchasing/new" className="flex items-center justify-between gap-3 rounded-app border border-border bg-surface-subtle px-4 py-3 text-sm text-text-primary transition-colors hover:border-border-hover hover:bg-surface-hover"><span><strong>Revisá</strong> sugerencias de reposición</span><span className="shrink-0 font-medium text-primary">Revisar →</span></Link> : <div className="flex items-center gap-3 rounded-app border border-border bg-surface-subtle px-4 py-3 text-sm text-text-primary"><span>Las sugerencias de reposición están disponibles para planificación.</span></div>}
        <div className="flex flex-wrap items-center gap-3 rounded-app border border-border bg-surface-subtle px-4 py-3"><span className="text-xs font-semibold text-text-secondary">Filtrar por</span><Select aria-label="Filtrar por proveedor" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="w-full sm:w-48" compact><option value="">Todos los proveedores</option>{(suppliers ?? []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</Select><Input aria-label="Filtrar por fecha objetivo" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} compact className="w-full sm:w-36" /></div>
      </div>
    </section>
  );
}
