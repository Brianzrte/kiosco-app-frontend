"use client";

import { FormEvent, useCallback, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { ProductList, Stock } from "@/lib/types";

export function InventoryView() {
  const [selectedId, setSelectedId] = useState("");

  const fetcher = useCallback(
    () => api<ProductList>("/products").then((list) => list.products),
    [],
  );
  const { data: products, error, reload } = useLoad(fetcher);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (products === null) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Inventario</h1>
      <Select
        label="Producto"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="max-w-xl"
      >
        <option value="">Elegí un producto</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.sku})
          </option>
        ))}
      </Select>
      {selectedId && <StockPanel key={selectedId} productId={selectedId} />}
    </div>
  );
}

function StockPanel({ productId }: { productId: string }) {
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

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <LoadingState />;
  if (!data.stock)
    return <InitializeStockForm productId={productId} onDone={reload} />;
  const stock = data.stock;

  const low = stock.quantity <= stock.minimum_quantity;

  return (
    <div className="grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <h2 className="mb-4 text-sm font-medium text-text-secondary">
          Stock actual
        </h2>
        <p
          className={`data text-4xl font-semibold ${low ? "text-warning" : ""}`}
        >
          {stock.quantity}
          {low && (
            <Badge tone="warning" className="ml-3 align-middle">
              Stock bajo
            </Badge>
          )}
        </p>
        <p className="mt-4 text-sm text-text-secondary">
          Mínimo: <span className="data">{stock.minimum_quantity}</span>
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Última actualización:{" "}
          {new Date(stock.updated_at).toLocaleString("es-AR")}
        </p>
      </Card>
      <AdjustStockForm productId={productId} onDone={reload} />
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
    <Card className="max-w-xl">
      <h2 className="mb-1 text-sm font-medium">
        Este producto aún no tiene stock
      </h2>
      <p className="mb-4 text-sm text-text-secondary">
        Inicializá el stock para empezar a registrar movimientos.
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
        <Button type="submit" disabled={pending}>
          {pending ? "Inicializando…" : "Inicializar stock"}
        </Button>
      </form>
    </Card>
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
    <Card>
      <h2 className="mb-4 text-sm font-medium text-text-secondary">
        Ajustar stock
      </h2>
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
        <Button type="submit" disabled={pending || !reason.trim() || !quantity}>
          {pending ? "Registrando…" : "Registrar ajuste"}
        </Button>
      </form>
    </Card>
  );
}
