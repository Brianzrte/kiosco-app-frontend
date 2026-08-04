"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CollapsibleFilters } from "@/components/ui/CollapsibleFilters";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api";
import {
  isCountedCash,
  openingFundStatusLabel,
  reconciliationStatusLabel,
  reconciliationStatusTone,
} from "@/lib/cashClosing";
import { formatMoney } from "@/lib/money";
import { computePageSize, computeTotalPages } from "@/lib/pagination";
import { today } from "@/lib/reports";
import { CashierOpeningFund, DailyCashClosingStatusList, User } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { useLoad } from "@/lib/useLoad";

const PAGE_SIZE = 20;

function firstOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatBusinessDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatClosingTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function AmountCell({ value }: { value: string | null }) {
  return <>{value === null ? "—" : formatMoney(value)}</>;
}

export function CashClosingStatusReportView() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [page, setPage] = useState(1);
  const [reportVersion, setReportVersion] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/reports"
        className="text-sm font-medium text-primary hover:text-primary-hover"
      >
        ← Volver a reportes
      </Link>

      <PageHeader
        title="Conciliación de caja"
        description="Revisá los cierres diarios de cada cajero y los que requieren actualización."
      />

      <CollapsibleFilters activeFilterCount={0}>
        <Input
          label="Desde"
          type="date"
          compact
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
        />
        <Input
          label="Hasta"
          type="date"
          compact
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
        />
      </CollapsibleFilters>

      <OpeningFundForm onSaved={() => setReportVersion((version) => version + 1)} />

      <CashClosingStatusTable
        key={reportVersion}
        from={from}
        to={to}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}

function OpeningFundForm({ onSaved }: { onSaved: () => void }) {
  const toast = useToast();
  const [operatorID, setOperatorID] = useState("");
  const [businessDate, setBusinessDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fetcher = useCallback(
    () => api<{ users: User[]; total: number }>("/users?limit=100").then((response) => response.users),
    [],
  );
  const { data: users, error: usersError } = useLoad(fetcher);
  const operators = users?.filter((user) => user.active && (user.roles.includes("admin") || user.roles.includes("cashier"))) ?? [];
  const amountError = amount && !isCountedCash(amount) ? "Ingresá un importe con hasta dos decimales." : undefined;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!operatorID || !isCountedCash(amount)) return;
    setPending(true);
    setFormError(null);
    try {
      await api<CashierOpeningFund>("/cashier-opening-funds", {
        method: "POST",
        body: { cashier_id: operatorID, business_date: businessDate, amount },
      });
      toast("success", "Fondo inicial declarado");
      setAmount("");
      onSaved();
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div><h2 className="text-lg font-semibold tracking-tight">Declarar fondo inicial</h2><p className="mt-1 text-sm text-text-secondary">Asignalo a un operador antes de que inicie su turno.</p></div>
        {usersError ? <p role="alert" className="text-sm text-error">{usersError.message}</p> : <div className="grid gap-4 md:grid-cols-3"><Select label="Operador" value={operatorID} onChange={(event) => setOperatorID(event.target.value)} disabled={!users || pending} required><option value="">Seleccioná un operador</option>{operators.map((user) => <option key={user.id} value={user.id}>{user.username}</option>)}</Select><Input label="Fecha operativa" type="date" value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} disabled={pending} required /><Input label="Monto" type="text" inputMode="decimal" pattern="\d+(\.\d{1,2})?" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} error={amountError} disabled={pending} required /></div>}
        {formError && <p role="alert" className="text-sm text-error">{formError}</p>}
        <Button type="submit" className="self-start" pending={pending} disabled={!users || !!usersError || !operatorID || !isCountedCash(amount)}>Declarar fondo</Button>
      </form>
    </Card>
  );
}

function CashClosingStatusTable({
  from,
  to,
  page,
  onPageChange,
}: {
  from: string;
  to: string;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const mobileListRef = useRef<HTMLUListElement>(null);
  const desktopListRef = useRef<HTMLDivElement>(null);
  const fetcher = useCallback(
    () =>
      api<DailyCashClosingStatusList>(
        `/cash-closings/daily-status?from=${from}&to=${to}&page=${page}&limit=${pageSize}`,
      ),
    [from, to, page, pageSize],
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
      <EmptyState message="No hubo actividad de caja en el período seleccionado." />
    );
  }

  const totalPages = computeTotalPages(data.total, pageSize);
  return (
    <div className="flex flex-col gap-4">
      <ul ref={mobileListRef} className="flex flex-col gap-3 md:hidden">
        {data.items.map((item) => (
          <li key={`${item.business_date}-${item.cashier_id}`} className="rounded-app border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.cashier_username}</p>
                <p className="num text-sm text-text-secondary">{formatBusinessDate(item.business_date)}</p>
              </div>
              <Badge tone={reconciliationStatusTone(item.status)}>{reconciliationStatusLabel(item.status)}</Badge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-text-secondary">Diferencia</dt><dd className="num font-medium"><AmountCell value={item.difference} /></dd></div>
              <div><dt className="text-text-secondary">Ventas</dt><dd className="num">{item.total_sales} · {formatMoney(item.total_amount)}</dd></div>
              {item.opening_fund && <div className="col-span-2"><dt className="text-text-secondary">Fondo inicial</dt><dd className="mt-1 flex flex-wrap items-center gap-2"><Badge tone={item.opening_fund.status === "confirmed" ? "success" : "warning"}>{openingFundStatusLabel(item.opening_fund.status)}</Badge><span className="num">{formatMoney(item.opening_fund.amount)}</span></dd></div>}
            </dl>
          </li>
        ))}
      </ul>
      <div ref={desktopListRef} className="hidden md:block">
      <Table>
        <thead>
          <tr>
            <Th>Fecha</Th>
            <Th>Cajero</Th>
            <Th>Estado</Th>
            <Th>Fondo inicial</Th>
            <Th className="text-right">Ventas</Th>
            <Th className="text-right">Efectivo esperado</Th>
            <Th className="text-right">Contado</Th>
            <Th className="text-right">Diferencia</Th>
            <Th className="text-right">Último cierre</Th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={`${item.business_date}-${item.cashier_id}`}>
              <Td className="num whitespace-nowrap">
                {formatBusinessDate(item.business_date)}
              </Td>
              <Td className="font-medium">{item.cashier_username}</Td>
              <Td>
                <Badge tone={reconciliationStatusTone(item.status)}>
                  {reconciliationStatusLabel(item.status)}
                </Badge>
              </Td>
              <Td>{item.opening_fund && <span className="flex items-center gap-2 whitespace-nowrap"><Badge tone={item.opening_fund.status === "confirmed" ? "success" : "warning"}>{openingFundStatusLabel(item.opening_fund.status)}</Badge><span className="num text-xs">{formatMoney(item.opening_fund.amount)}</span></span>}</Td>
              <Td className="num text-right">
                {item.total_sales} · {formatMoney(item.total_amount)}
              </Td>
              <Td className="num text-right">
                <AmountCell value={item.expected_cash} />
              </Td>
              <Td className="num text-right">
                <AmountCell value={item.counted_cash} />
              </Td>
              <Td className="num text-right font-medium">
                <AmountCell value={item.difference} />
              </Td>
              <Td className="num text-right">
                {formatClosingTime(item.latest_closing?.closed_at ?? null)}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-text-secondary">
            Página {page} de {totalPages} · {data.total} cierres diarios
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
