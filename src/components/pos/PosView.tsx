"use client";

import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import { fromCents, toCents, formatMoney } from "@/lib/money";
import {
  composeSplitPayment,
  type PaymentInput,
  type SplitPaymentMethod,
} from "@/lib/paymentComposition";
import { Product, ProductList, Sale, Stock } from "@/lib/types";

type CartLine = { product: Product; quantity: number };

const PAYMENT_LABELS: Record<SplitPaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
};

export function PosView() {
  const toast = useToast();
  const scanRef = useRef<HTMLInputElement>(null);
  const splitAmountRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<SplitPaymentMethod | null>(null);
  const [splitPayments, setSplitPayments] = useState<PaymentInput[] | null>(
    null,
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [unknownState, setUnknownState] = useState(false);
  const [pending, setPending] = useState(false);
  // flash: product id + a nonce so repeated scans retrigger the animation
  const [flash, setFlash] = useState<{ id: string; nonce: number } | null>(
    null,
  );
  const [confirmedSale, setConfirmedSale] = useState<{
    total: string;
    saleNumber: number | null;
  } | null>(null);
  const [totalFlash, setTotalFlash] = useState(0);
  // manual search: lazy-loaded catalog, filtered client-side (no search endpoint yet)
  const [searchTerm, setSearchTerm] = useState("");
  const [catalog, setCatalog] = useState<Product[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const catalogRequested = useRef(false);
  // Stock available per product, fetched lazily the first time it's needed
  // and cached — the cart quantity is capped against it so a cashier can
  // never sell more than what's actually in inventory.
  const [stockByProduct, setStockByProduct] = useState<Record<string, number>>(
    {},
  );

  async function availableStock(
    productId: string,
  ): Promise<number | undefined> {
    if (productId in stockByProduct) return stockByProduct[productId];
    try {
      const stock = await api<Stock>(`/inventory/stock/${productId}`);
      setStockByProduct((prev) => ({ ...prev, [productId]: stock.quantity }));
      return stock.quantity;
    } catch {
      // Unknown stock never blocks a scan — the backend remains the
      // authority and rejects an over-sell at confirm time regardless.
      return undefined;
    }
  }

  function refocus() {
    setBarcode("");
    // defer so the focus lands after React re-renders and after the browser's
    // default focus handling on the clicked element
    requestAnimationFrame(() => scanRef.current?.focus());
  }

  async function scan(event: FormEvent) {
    event.preventDefault();
    const code = barcode.trim();
    if (!code || pending) return;
    setScanError(null);
    try {
      const product = await api<Product>(
        `/products/barcode/${encodeURIComponent(code)}`,
      );
      if (!product.active) {
        setScanError(
          `“${product.name}” está inactivo y no se puede vender. Activalo en Productos si corresponde.`,
        );
        return;
      }
      await addToCart(product);
    } catch (e) {
      const err = e as ApiError;
      setScanError(
        err.status === 404
          ? `No hay ningún producto con el código ${code}. Verificá el código o cargalo en Productos.`
          : err.message,
      );
    } finally {
      refocus();
    }
  }

  function stockLimitMessage(product: Product, available: number): string {
    return available === 0
      ? `“${product.name}” no tiene stock disponible.`
      : `Solo hay ${available} unidad${available === 1 ? "" : "es"} disponible${
          available === 1 ? "" : "s"
        } de “${product.name}”.`;
  }

  async function addToCart(product: Product) {
    const currentQuantity =
      cart.find((l) => l.product.id === product.id)?.quantity ?? 0;
    const available = await availableStock(product.id);
    if (available !== undefined && currentQuantity + 1 > available) {
      setScanError(stockLimitMessage(product, available));
      return;
    }
    setConfirmedSale(null);
    setScanError(null);
    setCart((lines) => {
      const existing = lines.find((l) => l.product.id === product.id);
      if (existing) {
        return lines.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...lines, { product, quantity: 1 }];
    });
    setFlash((f) => ({ id: product.id, nonce: (f?.nonce ?? 0) + 1 }));
    setTotalFlash((n) => n + 1);
  }

  async function incrementQuantity(line: CartLine) {
    const available = await availableStock(line.product.id);
    if (available !== undefined && line.quantity + 1 > available) {
      setScanError(stockLimitMessage(line.product, available));
      return;
    }
    setQuantity(line.product.id, line.quantity + 1);
  }

  async function loadCatalog() {
    if (catalogRequested.current) return;
    catalogRequested.current = true;
    setCatalogError(null);
    try {
      const list = await api<ProductList>("/products");
      setCatalog(list.products);
    } catch (e) {
      catalogRequested.current = false;
      setCatalogError((e as ApiError).message);
    }
  }

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term || !catalog) return [];
    return catalog
      .filter(
        (p) => p.active && `${p.name} ${p.sku}`.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [catalog, searchTerm]);

  async function pickSearchResult(product: Product) {
    await addToCart(product);
    setSearchTerm("");
    refocus();
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const target = searchResults[activeResultIndex] ?? searchResults[0];
    if (target) pickSearchResult(target);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSearchTerm("");
      return;
    }
    if (searchResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveResultIndex((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveResultIndex((i) => Math.max(i - 1, 0));
    }
  }

  function setQuantity(productId: string, quantity: number) {
    setCart((lines) =>
      quantity <= 0
        ? lines.filter((l) => l.product.id !== productId)
        : lines.map((l) =>
            l.product.id === productId ? { ...l, quantity } : l,
          ),
    );
    setTotalFlash((n) => n + 1);
    refocus();
  }

  const totalCents = cart.reduce(
    (sum, line) => sum + toCents(line.product.price) * line.quantity,
    0,
  );
  const saleTotal = fromCents(totalCents);

  function selectPaymentMethod(method: SplitPaymentMethod) {
    setPayment(method);
    if (splitPayments) {
      setSplitPayments(
        composeSplitPayment(saleTotal, method, splitPayments[0].amount),
      );
    }
  }

  function startSplitPayment() {
    const method = payment ?? "CASH";
    setPayment(method);
    setSplitPayments(composeSplitPayment(saleTotal, method, ""));
    requestAnimationFrame(() => splitAmountRef.current?.focus());
  }

  function updateSplitAmount(amount: string) {
    if (!splitPayments) return;
    setSplitPayments(
      composeSplitPayment(saleTotal, splitPayments[0].method, amount),
    );
  }

  const paymentPayload = splitPayments ??
    (payment ? [{ method: payment, amount: saleTotal }] : []);
  const hasSplitAmount = !splitPayments || splitPayments[0].amount.trim() !== "";

  async function confirmSale() {
    if (cart.length === 0 || !payment || !hasSplitAmount || pending) return;
    setConfirmError(null);
    setUnknownState(false);
    setPending(true);
    const total = formatMoney(saleTotal);
    try {
      const sale = await api<{ id: string }>("/sales", { method: "POST" });
      for (const line of cart) {
        await api(`/sales/${sale.id}/items`, {
          method: "POST",
          body: { product_id: line.product.id, quantity: line.quantity },
        });
      }
      await api(`/sales/${sale.id}/payment`, {
        method: "PUT",
        body: {
          payments: paymentPayload,
        },
      });
      const confirmed = await api<Sale>(`/sales/${sale.id}/confirm`, {
        method: "POST",
      });
      toast("success", "Venta confirmada");
      setConfirmedSale({ total, saleNumber: confirmed.sale_number ?? null });
      setCart([]);
      setPayment(null);
      setSplitPayments(null);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 0) {
        setUnknownState(true);
      } else {
        setConfirmError(err.message);
      }
    } finally {
      setPending(false);
      refocus();
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-4">
        <form onSubmit={scan}>
          <label htmlFor="scan" className="mb-1.5 block text-sm font-medium">
            Escaneá o ingresá un código de barras
          </label>
          <input
            id="scan"
            ref={scanRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            autoFocus
            autoComplete="off"
            placeholder="Código de barras"
            className="data w-full rounded-app border-2 border-border bg-surface px-5 py-4 text-lg shadow-soft placeholder:font-sans placeholder:text-text-disabled hover:border-border-hover focus:border-primary"
          />
        </form>

        <div>
          <form onSubmit={submitSearch}>
            <label
              htmlFor="pos-search"
              className="mb-1.5 block text-sm font-medium"
            >
              ¿Sin código? Buscá el producto por nombre
            </label>
            <input
              id="pos-search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setActiveResultIndex(0);
                if (e.target.value.trim()) void loadCatalog();
              }}
              onKeyDown={handleSearchKeyDown}
              autoComplete="off"
              placeholder="Nombre o SKU del producto"
              role="combobox"
              aria-expanded={searchResults.length > 0}
              aria-controls="pos-search-results"
              aria-activedescendant={
                searchResults[activeResultIndex]
                  ? `pos-search-result-${searchResults[activeResultIndex].id}`
                  : undefined
              }
              className="w-full rounded-app border border-border bg-surface px-4 py-2.5 shadow-soft placeholder:text-text-disabled hover:border-border-hover focus:border-primary"
            />
          </form>

          {catalogError && searchTerm.trim() && (
            <p className="mt-2 text-sm text-error">
              No se pudo cargar el catálogo: {catalogError}. Escribí de nuevo
              para reintentar.
            </p>
          )}

          {searchTerm.trim() && !catalogError && (
            <ul
              id="pos-search-results"
              className="mt-2 overflow-hidden rounded-app border border-border bg-surface shadow-soft"
            >
              {catalog === null ? (
                <li className="px-4 py-3 text-sm text-text-secondary">
                  Buscando productos…
                </li>
              ) : searchResults.length === 0 ? (
                <li className="px-4 py-3 text-sm text-text-secondary">
                  Ningún producto activo coincide con “{searchTerm.trim()}”.
                </li>
              ) : (
                searchResults.map((p, index) => (
                  <li
                    key={p.id}
                    id={`pos-search-result-${p.id}`}
                    role="option"
                    aria-selected={index === activeResultIndex}
                    className="border-b border-border last:border-b-0"
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveResultIndex(index)}
                      onClick={() => pickSearchResult(p)}
                      className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 ${
                        index === activeResultIndex ? "bg-surface-2" : ""
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {p.name}
                        </span>
                        <span className="data block text-xs text-text-secondary">
                          {p.sku}
                        </span>
                      </span>
                      <span className="num font-semibold">
                        {formatMoney(p.price)}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {scanError && (
          <div
            role="alert"
            className="rounded-app border border-error/40 bg-error/10 px-4 py-3 text-sm font-medium text-error"
          >
            {scanError}
          </div>
        )}

        {cart.length === 0 ? (
          <EmptyState message="El carrito está vacío. Escaneá un producto para empezar la venta." />
        ) : (
          <Card className="p-0">
            <ul>
              {cart.map((line) => (
                <li
                  key={
                    flash?.id === line.product.id
                      ? `${line.product.id}-${flash.nonce}`
                      : line.product.id
                  }
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3 last:border-b-0 md:px-5 ${
                    flash?.id === line.product.id ? "flash" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate font-medium">{line.product.name}</p>
                    <p className="num text-sm text-text-secondary">
                      {formatMoney(line.product.price)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      aria-label={`Restar uno a ${line.product.name}`}
                      className="size-11 !p-0 md:size-9"
                      onClick={() =>
                        setQuantity(line.product.id, line.quantity - 1)
                      }
                    >
                      −
                    </Button>
                    <span className="num w-10 text-center">
                      {line.quantity}
                    </span>
                    <Button
                      variant="secondary"
                      aria-label={`Sumar uno a ${line.product.name}`}
                      className="size-11 !p-0 md:size-9"
                      onClick={() => incrementQuantity(line)}
                    >
                      +
                    </Button>
                  </div>
                  <p className="num w-24 text-right font-semibold">
                    {formatMoney(
                      fromCents(toCents(line.product.price) * line.quantity),
                    )}
                  </p>
                  <Button
                    variant="ghost"
                    aria-label={`Quitar ${line.product.name}`}
                    className="!text-error hover:!bg-error/10"
                    onClick={() => setQuantity(line.product.id, 0)}
                  >
                    Quitar
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Card className="h-fit lg:sticky lg:top-6">
        <h2 className="mb-2 text-center text-sm font-medium text-text-secondary">
          Total
        </h2>
        <div className="mb-6 flex min-h-[3.75rem] items-center justify-center">
          <p
            key={totalFlash}
            className={`num whitespace-nowrap text-center text-4xl font-bold tracking-tight sm:text-5xl ${
              totalFlash > 0 ? "total-flash" : ""
            }`}
          >
            {formatMoney(fromCents(totalCents))}
          </p>
        </div>

        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-medium">
            {splitPayments ? "Pagos divididos" : "Método de pago"}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["CASH", "Efectivo"],
                ["CARD", "Tarjeta"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-app border px-4 py-3 text-center text-sm font-medium transition-colors ${
                  payment === value
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border text-text-secondary hover:border-border-hover"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={value}
                  checked={payment === value}
                  onChange={() => selectPaymentMethod(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>

          {splitPayments ? (
            <div className="mt-3 flex flex-col gap-3 rounded-app border border-border bg-surface-2 p-3">
              <Input
                ref={splitAmountRef}
                label={`${PAYMENT_LABELS[splitPayments[0].method]} (importe)`}
                value={splitPayments[0].amount}
                onChange={(event) => updateSplitAmount(event.target.value)}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
              />
              <div className="rounded-app border border-border bg-surface px-3.5 py-2.5">
                <p className="text-sm font-medium">
                  {PAYMENT_LABELS[splitPayments[1].method]}
                </p>
                <p className="num mt-1 text-lg font-semibold">
                  {formatMoney(splitPayments[1].amount)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="self-start"
                onClick={() => setSplitPayments(null)}
              >
                Usar un solo medio
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="mt-3"
              disabled={cart.length === 0}
              onClick={startSplitPayment}
            >
              Dividir pago
            </Button>
          )}
        </fieldset>

        {confirmError && (
          <p className="mb-4 text-sm text-error">{confirmError}</p>
        )}
        {unknownState && (
          <p className="mb-4 rounded-app border border-warning bg-surface px-3 py-2 text-sm text-warning">
            Falló la conexión y no se sabe si la venta se confirmó. Verificá el
            estado antes de reintentar; el carrito se conservó.
          </p>
        )}

        <Button
          className="w-full py-3.5 text-base"
          disabled={cart.length === 0 || !payment || !hasSplitAmount}
          pending={pending}
          pendingImmediate
          onClick={confirmSale}
        >
          {pending ? "Confirmando…" : "Confirmar venta"}
        </Button>
      </Card>

      {confirmedSale && (
        <div
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-xs rounded-app border border-border bg-surface px-6 py-5 shadow-soft-lg"
        >
          <div className="pop-in flex flex-col gap-1">
            <p className="text-sm font-medium text-text-secondary">
              Venta confirmada
            </p>
            {confirmedSale.saleNumber !== null && (
              <p className="num select-text text-3xl font-bold text-primary">
                #{confirmedSale.saleNumber}
              </p>
            )}
            <p className="num text-lg font-semibold">{confirmedSale.total}</p>
          </div>
        </div>
      )}
    </div>
  );
}
