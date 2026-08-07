"use client";

import { KeyboardEvent, useCallback, useState } from "react";
import { useNavigationRouter } from "@/components/shell/useNavigationRouter";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CollapsibleFilters } from "@/components/ui/CollapsibleFilters";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { ExpensesContextualActions } from "@/components/expenses/ExpensesContextualActions";
import { api } from "@/lib/api";
import {
  barPercent,
  categoryBucketLabel,
  currentMonthRange,
  EXPENSE_PAYMENT_METHODS,
  expenseCountsTowardClosing,
  expenseFiltersToQuery,
  ExpenseFilters,
  expenseStatusLabel,
  expenseTypeLabel,
  hasActiveFilters,
  normalizedSummaryEntries,
  paymentMethodLabel,
  SELECTABLE_EXPENSE_TYPES,
  summaryEntries,
} from "@/lib/expenses";
import { formatMoney } from "@/lib/money";
import { computeTotalPages } from "@/lib/pagination";
import {
  ExpenseCategory,
  ExpenseList,
  ExpensePaymentMethod,
  ExpenseStatus,
  ExpenseSummary,
  ExpenseType,
} from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

const PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function statusTone(status: ExpenseStatus) {
  return status === "ACTIVE" ? ("success" as const) : ("neutral" as const);
}

/**
 * `/expenses` — hub de la sección (bloque B/C). Los totales vienen siempre
 * de `GET /expenses/summary` para el rango de fechas, nunca sumados del
 * listado paginado (spec: "Period totals come from the backend"). Gastos del
 * negocio y retiros se muestran como dos cifras separadas (D8) — nunca una
 * suma.
 *
 * El desglose por medio de pago del mockup (`design/01-hub-*`) muestra una
 * cifra de "Retiros" aparte dentro de cada tarjeta; no se reproduce acá
 * porque `GET /expenses/summary` no la puede dar (verificado en vivo el
 * 2026-08-06: `by_payment_method` mezcla gastos y retiros del mismo medio,
 * sin cruce tipo×medio) — ver `types.ts` → `ExpenseSummary`.
 */
export function ExpensesHubView() {
  const router = useNavigationRouter();
  const defaultRange = currentMonthRange();
  const [filters, setFilters] = useState<ExpenseFilters>({
    from: defaultRange.from,
    to: defaultRange.to,
    type: "",
    categoryId: "",
    paymentMethod: "",
    status: "",
  });
  const [page, setPage] = useState(1);

  const categoriesFetcher = useCallback(
    () =>
      api<{ items: ExpenseCategory[] }>(
        "/expense-categories?include_inactive=true",
      ).then((r) => r.items),
    [],
  );
  const { data: categories } = useLoad(categoriesFetcher);

  const summaryFetcher = useCallback(
    () =>
      api<ExpenseSummary>(
        `/expenses/summary?from=${filters.from}&to=${filters.to}`,
      ),
    [filters.from, filters.to],
  );
  const {
    data: summary,
    error: summaryError,
    reload: reloadSummary,
  } = useLoad(summaryFetcher);

  const listFetcher = useCallback(() => {
    const query = expenseFiltersToQuery(filters, page);
    return api<ExpenseList>(`/expenses?${query}&limit=${PAGE_SIZE}`);
  }, [filters, page]);
  const {
    data: list,
    error: listError,
    reload: reloadList,
  } = useLoad(listFetcher);

  const filtersAppliedBeyondDefault =
    hasActiveFilters(filters) ||
    filters.from !== defaultRange.from ||
    filters.to !== defaultRange.to;

  function updateFilter<K extends keyof ExpenseFilters>(
    key: K,
    value: ExpenseFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({
      from: defaultRange.from,
      to: defaultRange.to,
      type: "",
      categoryId: "",
      paymentMethod: "",
      status: "",
    });
    setPage(1);
  }

  const openExpense = (id: string) => router.push(`/expenses/${id}`);
  const onRowKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openExpense(id);
  };

  const categoryName = (id: string | null) =>
    id
      ? ((categories ?? []).find((c) => c.id === id)?.name ?? "Rubro")
      : "Sin rubro";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="¿En qué se fue la plata?"
        actions={<ExpensesContextualActions screen="hub" />}
      />

      {summaryError ? (
        <ErrorState error={summaryError} onRetry={reloadSummary} />
      ) : !summary ? (
        <ListSkeleton rows={2} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <p className="text-sm text-text-secondary">Gastos del negocio</p>
              <p className="num mt-1 text-2xl font-semibold text-text-primary">
                {formatMoney(summary.total_business_expenses)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-text-secondary">Retiros personales</p>
              <p className="num mt-1 text-2xl font-semibold text-text-primary">
                {formatMoney(summary.total_owner_draws)}
              </p>
            </Card>
          </div>
          <p className="-mt-2 text-xs text-text-secondary">
            Dos cifras separadas: un retiro no es un gasto del negocio y nunca
            se suma con ellos.
          </p>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Por medio de pago
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible">
              {normalizedSummaryEntries(
                summary.by_payment_method,
                EXPENSE_PAYMENT_METHODS,
                (key) => paymentMethodLabel(key as ExpensePaymentMethod),
              ).map((entry) => (
                <Card
                  key={entry.key}
                  className="min-w-[10rem] shrink-0 sm:min-w-0"
                >
                  <p className="text-sm text-text-secondary">{entry.label}</p>
                  <p className="num mt-1 text-lg font-semibold text-text-primary">
                    {formatMoney(entry.amount)}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Por rubro
              </p>
              <ul className="flex flex-col gap-2">
                {summaryEntries(summary.by_category, categoryBucketLabel).map(
                  (entry, _index, all) => (
                    <li key={entry.key || "sin-rubro"} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-text-primary">
                          {entry.label}
                        </span>
                        <span className="num shrink-0 font-medium">
                          {formatMoney(entry.amount)}
                        </span>
                      </div>
                      <div
                        aria-hidden
                        className="mt-1 h-1.5 rounded-full bg-surface-2"
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${barPercent(entry.amount, all[0]?.amount ?? "0.00")}%`,
                          }}
                        />
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Por tipo
              </p>
              <ul className="flex flex-col gap-2">
                {summaryEntries(summary.by_type, (key) =>
                  expenseTypeLabel(key as ExpenseType),
                ).map((entry, _index, all) => (
                  <li key={entry.key} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-text-primary">
                        {entry.key === "OWNER_DRAW"
                          ? "Retiros personales (no son gastos del negocio)"
                          : entry.label}
                      </span>
                      <span className="num shrink-0 font-medium">
                        {formatMoney(entry.amount)}
                      </span>
                    </div>
                    <div
                      aria-hidden
                      className="mt-1 h-1.5 rounded-full bg-surface-2"
                    >
                      <div
                        className={`h-full rounded-full ${entry.key === "OWNER_DRAW" ? "bg-text-disabled" : "bg-primary"}`}
                        style={{
                          width: `${barPercent(entry.amount, all[0]?.amount ?? "0.00")}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      <div className="rounded-app border border-border bg-surface-subtle px-3 py-1.5 md:p-3">
        <CollapsibleFilters
          activeFilterCount={
            Number(Boolean(filters.type)) +
            Number(Boolean(filters.categoryId)) +
            Number(Boolean(filters.paymentMethod)) +
            Number(Boolean(filters.status))
          }
        >
          <Input
            label="Desde"
            type="date"
            compact
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="w-full sm:w-auto"
          />
          <Input
            label="Hasta"
            type="date"
            compact
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="w-full sm:w-auto"
          />
          <Select
            label="Tipo"
            value={filters.type}
            onChange={(e) =>
              updateFilter("type", e.target.value as ExpenseType | "")
            }
            className="w-full sm:w-44"
          >
            <option value="">Todos los tipos</option>
            {[...SELECTABLE_EXPENSE_TYPES, "PAYROLL" as const].map((option) => (
              <option key={option} value={option}>
                {expenseTypeLabel(option)}
              </option>
            ))}
          </Select>
          <Select
            label="Rubro"
            value={filters.categoryId}
            onChange={(e) => updateFilter("categoryId", e.target.value)}
            className="w-full sm:w-44"
          >
            <option value="">Todos los rubros</option>
            {(categories ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {!category.active ? " (archivado)" : ""}
              </option>
            ))}
          </Select>
          <Select
            label="Medio"
            value={filters.paymentMethod}
            onChange={(e) =>
              updateFilter(
                "paymentMethod",
                e.target.value as ExpensePaymentMethod | "",
              )
            }
            className="w-full sm:w-44"
          >
            <option value="">Todos los medios</option>
            {EXPENSE_PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {paymentMethodLabel(method)}
              </option>
            ))}
          </Select>
          <Select
            label="Estado"
            value={filters.status}
            onChange={(e) =>
              updateFilter("status", e.target.value as ExpenseStatus | "")
            }
            className="w-full sm:w-40"
          >
            <option value="">Activos y anulados</option>
            <option value="ACTIVE">Activos</option>
            <option value="VOID">Anulados</option>
          </Select>
          {filtersAppliedBeyondDefault && (
            <Button variant="ghost" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </CollapsibleFilters>
      </div>

      {listError ? (
        <ErrorState error={listError} onRetry={reloadList} />
      ) : !list ? (
        <ListSkeleton rows={6} />
      ) : list.items.length === 0 ? (
        <EmptyState
          message={
            filtersAppliedBeyondDefault
              ? "Ningún egreso coincide con los filtros aplicados."
              : "Todavía no registraste ningún egreso. Cada vez que sale plata del negocio —combustible, sueldos, mercadería, un retiro— registralo acá para que el cierre de caja cierre solo."
          }
          action={
            filtersAppliedBeyondDefault ? (
              <Button variant="secondary" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Button onClick={() => router.push("/expenses/new")}>
                Registrar el primer egreso
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="text-sm text-text-secondary" aria-live="polite">
            {list.total === 1
              ? "1 egreso en el período"
              : `${list.total} egresos en el período`}
          </p>
          <ul className="flex flex-col gap-3 md:hidden">
            {list.items.map((expense) => (
              <li
                key={expense.id}
                role="button"
                tabIndex={0}
                onClick={() => openExpense(expense.id)}
                onKeyDown={(e) => onRowKeyDown(e, expense.id)}
                className={`rounded-app border border-border bg-surface p-4 transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover ${expense.status === "VOID" ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-text-secondary">
                      {formatDate(expense.business_date)} ·{" "}
                      {expenseTypeLabel(expense.type)}
                    </p>
                    <p className="truncate font-medium text-text-primary">
                      {categoryName(expense.expense_category_id)}
                    </p>
                  </div>
                  <span
                    className={`num shrink-0 font-semibold ${expense.status === "VOID" ? "text-text-disabled line-through" : "text-text-primary"}`}
                  >
                    {formatMoney(expense.amount)}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm text-text-secondary">
                  {expense.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">
                    {paymentMethodLabel(expense.payment_method)}
                  </Badge>
                  {expenseCountsTowardClosing(expense) && (
                    <span className="text-xs font-semibold text-(--color-warning-strong)">
                      Afecta caja
                    </span>
                  )}
                  <Badge tone={statusTone(expense.status)}>
                    {expenseStatusLabel(expense.status)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Tipo</Th>
                  <Th>Rubro</Th>
                  <Th>Medio</Th>
                  <Th>Descripción</Th>
                  <Th className="text-right">Monto</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((expense) => (
                  <tr
                    key={expense.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openExpense(expense.id)}
                    onKeyDown={(e) => onRowKeyDown(e, expense.id)}
                    className={`cursor-pointer transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover focus-visible:bg-surface-hover ${expense.status === "VOID" ? "opacity-60" : ""}`}
                  >
                    <Td>{formatDate(expense.business_date)}</Td>
                    <Td>{expenseTypeLabel(expense.type)}</Td>
                    <Td>{categoryName(expense.expense_category_id)}</Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">
                          {paymentMethodLabel(expense.payment_method)}
                        </Badge>
                        {expenseCountsTowardClosing(expense) && (
                          <span className="text-xs font-semibold text-(--color-warning-strong)">
                            Afecta caja
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className="max-w-[16rem] truncate">
                      {expense.description}
                    </Td>
                    <Td
                      className={`num text-right ${expense.status === "VOID" ? "text-text-disabled line-through" : ""}`}
                    >
                      {formatMoney(expense.amount)}
                    </Td>
                    <Td>
                      <Badge tone={statusTone(expense.status)}>
                        {expenseStatusLabel(expense.status)}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          {computeTotalPages(list.total, PAGE_SIZE) > 1 && (
            <div className="flex items-center justify-end gap-2">
              <p className="mr-auto text-sm text-text-secondary">
                Página {page} de {computeTotalPages(list.total, PAGE_SIZE)}
              </p>
              <Button
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                disabled={page === computeTotalPages(list.total, PAGE_SIZE)}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
