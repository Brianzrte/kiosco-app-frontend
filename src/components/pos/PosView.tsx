"use client";

import { FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import { fromCents, toCents, formatMoney } from "@/lib/money";
import { Product } from "@/lib/types";

type CartLine = { product: Product; quantity: number };

type PaymentMethod = "cash" | "card";

export function PosView() {
  const toast = useToast();
  const scanRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [unknownState, setUnknownState] = useState(false);
  const [pending, setPending] = useState(false);

  function refocus() {
    setBarcode("");
    scanRef.current?.focus();
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
        setScanError(`“${product.name}” está inactivo y no se puede vender.`);
        return;
      }
      setCart((lines) => {
        const existing = lines.find((l) => l.product.id === product.id);
        if (existing) {
          return lines.map((l) =>
            l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l,
          );
        }
        return [...lines, { product, quantity: 1 }];
      });
    } catch (e) {
      const err = e as ApiError;
      setScanError(
        err.status === 404
          ? `No hay ningún producto con el código ${code}.`
          : err.message,
      );
    } finally {
      refocus();
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
    refocus();
  }

  const totalCents = cart.reduce(
    (sum, line) => sum + toCents(line.product.price) * line.quantity,
    0,
  );

  async function confirmSale() {
    if (cart.length === 0 || !payment || pending) return;
    setConfirmError(null);
    setUnknownState(false);
    setPending(true);
    try {
      const sale = await api<{ id: string }>("/sales", {
        method: "POST",
        body: {
          payment_method: payment,
          items: cart.map((line) => ({
            product_id: line.product.id,
            quantity: line.quantity,
            unit_price: line.product.price,
          })),
        },
      });
      await api(`/sales/${sale.id}/confirm`, { method: "POST" });
      toast("success", "Venta confirmada");
      setCart([]);
      setPayment(null);
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
      <div className="flex flex-col gap-6">
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
          {scanError && <p className="mt-2 text-sm text-error">{scanError}</p>}
        </form>

        {cart.length === 0 ? (
          <EmptyState message="El carrito está vacío. Escaneá un producto para empezar la venta." />
        ) : (
          <Card className="p-0">
            <ul>
              {cart.map((line) => (
                <li
                  key={line.product.id}
                  className="flex items-center gap-4 border-b border-border px-5 py-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{line.product.name}</p>
                    <p className="data text-sm text-text-secondary">
                      {formatMoney(line.product.price)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      aria-label={`Restar uno a ${line.product.name}`}
                      className="size-9 !p-0"
                      onClick={() =>
                        setQuantity(line.product.id, line.quantity - 1)
                      }
                    >
                      −
                    </Button>
                    <span className="data w-10 text-center">{line.quantity}</span>
                    <Button
                      variant="secondary"
                      aria-label={`Sumar uno a ${line.product.name}`}
                      className="size-9 !p-0"
                      onClick={() =>
                        setQuantity(line.product.id, line.quantity + 1)
                      }
                    >
                      +
                    </Button>
                  </div>
                  <p className="data w-24 text-right font-medium">
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
        <h2 className="mb-4 text-sm font-medium text-text-secondary">Total</h2>
        <p className="data mb-6 text-4xl font-semibold">
          {formatMoney(fromCents(totalCents))}
        </p>

        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-medium">Método de pago</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["cash", "Efectivo"],
                ["card", "Tarjeta"],
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
                  onChange={() => setPayment(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
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
          disabled={cart.length === 0 || !payment || pending}
          onClick={confirmSale}
        >
          {pending ? "Confirmando…" : "Confirmar venta"}
        </Button>
      </Card>
    </div>
  );
}
