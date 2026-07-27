"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { Stock } from "@/lib/types";

type StockListItem = {
  product_id: string;
  sku: string;
  name: string;
  barcode: string | null;
  active: boolean;
  initialized: boolean;
  quantity: number;
  minimum_quantity: number;
  updated_at: string | null;
};

type StockList = { items: StockListItem[]; total: number };

const PAGE_SIZE = 20;

export function InventoryView() {
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [offset, setOffset] = useState(0);

  // Debounce: the backend does the filtering, so wait for the user to stop typing.
  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(search.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetcher = useCallback(
    () =>
      api<StockList>(
        `/inventory/stock?search=${encodeURIComponent(term)}&limit=${PAGE_SIZE}&offset=${offset}`,
      ),
    [term, offset],
  );
  const { data, error, reload } = useLoad(fetcher);
  const rows = data?.items ?? null;
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Inventario</h1>

      <Input
        placeholder="Buscar por nombre, SKU o código de barras"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xl"
        aria-label="Buscar producto"
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          message={
            term === ""
              ? "Todavía no hay productos. Crealos en Productos para gestionar su stock."
              : "Ningún producto coincide con la búsqueda."
          }
        />
      ) : (
        <>
          <ul className="overflow-hidden rounded-app border border-border bg-surface shadow-soft">
            {rows.map((item) => {
              const low =
                item.initialized && item.quantity <= item.minimum_quantity;
              return (
                <li
                  key={item.product_id}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-3 last:border-b-0 ${
                    selectedId === item.product_id ? "bg-primary-light/40" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="data text-xs text-text-secondary">
                      {item.sku}
                    </p>
                  </div>
                  {!item.initialized ? (
                    <Badge tone="neutral">Sin stock inicial</Badge>
                  ) : (
                    <>
                      {low && <Badge tone="warning">Stock bajo</Badge>}
                      <p
                        className={`num w-16 text-right text-lg font-semibold ${
                          low ? "text-warning" : ""
                        }`}
                      >
                        {item.quantity}
                      </p>
                    </>
                  )}
                  <Button
                    variant="secondary"
                    className="min-h-11 md:min-h-9"
                    onClick={() => setSelectedId(item.product_id)}
                  >
                    {item.initialized ? "Ajustar" : "Inicializar"}
                  </Button>
                </li>
              );
            })}
          </ul>
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Mostrando {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de{" "}
                {total} productos
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!selectedId}
        title="Gestionar stock"
        onClose={() => setSelectedId("")}
      >
        {selectedId && (
          <StockPanel
            key={selectedId}
            productId={selectedId}
            onChanged={reload}
            onClose={() => setSelectedId("")}
          />
        )}
      </Dialog>
    </div>
  );
}

function StockPanel({
  productId,
  onChanged,
  onClose,
}: {
  productId: string;
  onChanged: () => void;
  onClose: () => void;
}) {
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
        onDone={() => {
          refreshAll();
          onClose();
        }}
      />
    );
  const stock = data.stock;

  const low = stock.quantity <= stock.minimum_quantity;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between rounded-app bg-surface-2 px-4 py-3">
        <div>
          <p className="text-sm text-text-secondary">Stock actual</p>
          <p
            className={`num text-2xl font-semibold ${low ? "text-warning" : ""}`}
          >
            {stock.quantity}
            <span className="ml-2 text-sm font-normal text-text-secondary">
              mín. {stock.minimum_quantity}
            </span>
          </p>
        </div>
        {low && <Badge tone="warning">Stock bajo</Badge>}
      </div>
      <AdjustStockForm
        productId={productId}
        onDone={() => {
          refreshAll();
          onClose();
        }}
      />
    </div>
  );
}

function InitializeStockForm({
  productId,
  onDone,
}: {
  productId: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const [quantity, setQuantity] = useState("0");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api("/inventory/stock", {
        method: "POST",
        body: {
          product_id: productId,
          quantity: parseInt(quantity, 10),
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
          label="Cantidad inicial"
          type="number"
          min={0}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
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
  onDone,
}: {
  productId: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason.trim()) return;
    setError(null);
    setPending(true);
    const amount = parseInt(quantity, 10);
    try {
      await api(`/inventory/stock/${productId}/adjust`, {
        method: "POST",
        body: {
          quantity_delta: direction === "in" ? amount : -amount,
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
            label="Cantidad"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
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
