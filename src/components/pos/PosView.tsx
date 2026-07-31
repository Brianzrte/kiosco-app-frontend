"use client";

import Link from "next/link";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import { CASH_CLOSING_STATUS_CHANGED } from "@/lib/cashClosing";
import { fromCents, toCents, formatMoney } from "@/lib/money";
import {
  calculateWeightedPrice,
  effectiveLinePrice,
  isValidWeight,
} from "@/lib/weightPricing";
import { MOTION } from "@/lib/motion";
import {
  composeSplitPayment,
  getPaymentBalance,
  isMoneyAmount,
  type SplitPaymentInput,
  type SplitPaymentMethod,
} from "@/lib/paymentComposition";
import { Product, ProductList, Sale, Stock } from "@/lib/types";
import {
  IconBarcode,
  IconCalculator,
  IconCardPay,
  IconCash,
  IconMinus,
  IconPlus,
  IconSearch,
  IconSplit,
  IconTrash,
  IconEdit,
  IconTransfer,
  IconX,
} from "@/components/ui/icons";

// Auto-dismiss delay for the post-sale confirmation panel. Not just a Toast
// (4s): this one also shows the sale number, total and a "Ver detalle" link,
// so it gets more time to read (~50ms/word floor, states-feedback.md) before
// it clears itself. Never gates the next sale either way — closing early
// (button, click outside) or scanning the next product both dismiss it.
const CONFIRMED_SALE_AUTO_DISMISS_MS = 6000;

// Shared panel transition for the "Dividir pago" / "Calcular vuelto" toggles
// below: a button is replaced by a small panel (or vice versa), which is a
// mount/unmount of a whole subtree — Motion's AnimatePresence territory
// (motion.md, Paso 2), not a CSS transition. Entry uses ease-out; exit is
// shorter and unanimated-feeling, per motion.md's entry/exit asymmetry.
const panelTransition = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  // Exit carries its own (shorter, per motion.md's entry/exit asymmetry)
  // transition — Motion reads a `transition` nested inside `exit` for the
  // unmount leg specifically, separate from the `transition` prop below
  // which governs the mount leg.
  exit: {
    opacity: 0,
    y: 2,
    transition: {
      duration: MOTION.fast / 1000,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
  transition: {
    duration: MOTION.base / 1000,
    ease: [0.16, 1, 0.3, 1] as const,
  },
};

type CartLine = {
  product: Product;
  quantity: number;
  weight?: string;
  calculatedPrice?: string;
  actualPrice?: string;
};

const PAYMENT_LABELS: Record<SplitPaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

// Decorative category color per payment method (not a status/event color —
// see ai/skills/ux-ui-supervisor/references/color-system.md). Uses the
// dedicated --color-payment-* tokens (globals.css, "POS payment accents"),
// not the generic --color-pastel-green/--color-pastel-yellow: those read as
// unrelated candy-bright category colors sitting next to the brand's
// violet accent. Transferencia uses the same muted blue family, not the
// raw --color-pastel-blue.
const PAYMENT_SELECTED_STYLES: Record<SplitPaymentMethod, string> = {
  CASH: "border-payment-cash bg-payment-cash text-text-primary",
  CARD: "border-payment-card bg-payment-card text-text-primary",
  TRANSFER: "border-payment-transfer bg-payment-transfer text-text-primary",
};

const PAYMENT_HOVER_STYLES: Record<SplitPaymentMethod, string> = {
  CASH: "hover:border-payment-cash hover:bg-payment-cash/30",
  CARD: "hover:border-payment-card hover:bg-payment-card/30",
  TRANSFER: "hover:border-payment-transfer hover:bg-payment-transfer/30",
};

const PAYMENT_OPTIONS = [
  ["CASH", "Efectivo"],
  ["CARD", "Tarjeta"],
  ["TRANSFER", "Transferencia"],
] as const satisfies readonly (readonly [SplitPaymentMethod, string])[];

// Purely decorative next to each chip's own text label — never the only
// signal for which method is selected (the chip's border/fill still carries
// that, per ui-system.md "estado nunca comunicado sólo por color").
const PAYMENT_ICONS: Record<SplitPaymentMethod, typeof IconCash> = {
  CASH: IconCash,
  CARD: IconCardPay,
  TRANSFER: IconTransfer,
};

export function PosView() {
  const shouldReduceMotion = useReducedMotion();
  const scanRef = useRef<HTMLInputElement>(null);
  const actualPriceRef = useRef<HTMLInputElement>(null);
  const splitAmountRef = useRef<HTMLInputElement>(null);
  const cashReceivedRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<SplitPaymentMethod | null>(null);
  const [splitPayments, setSplitPayments] = useState<
    SplitPaymentInput[] | null
  >(null);
  const [cashReceived, setCashReceived] = useState("");
  const [showCashChange, setShowCashChange] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [weightProduct, setWeightProduct] = useState<Product | null>(null);
  const [weightValue, setWeightValue] = useState("");
  const [weightError, setWeightError] = useState<string | null>(null);
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [actualPriceDraft, setActualPriceDraft] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [unknownState, setUnknownState] = useState(false);
  const [pending, setPending] = useState(false);
  // flash: product id + a nonce so repeated scans retrigger the animation
  const [flash, setFlash] = useState<{ id: string; nonce: number } | null>(
    null,
  );
  const [confirmedSale, setConfirmedSale] = useState<{
    id: string;
    total: string;
    saleNumber: number | null;
  } | null>(null);

  const [totalFlash, setTotalFlash] = useState(0);
  // manual search: lazy-loaded catalog, filtered client-side (no search endpoint yet)
  const [searchTerm, setSearchTerm] = useState("");
  const [catalog, setCatalog] = useState<Product[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [searchDismissed, setSearchDismissed] = useState(false);
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

  const refocus = useCallback(() => {
    setBarcode("");
    // defer so the focus lands after React re-renders and after the browser's
    // default focus handling on the clicked element
    requestAnimationFrame(() => scanRef.current?.focus());
  }, []);

  function beginWeightEntry(product: Product) {
    if (!product.price_per_kg || !isMoneyAmount(product.price_per_kg)) {
      setScanError(`“${product.name}” no tiene un precio por kilo válido y no se puede vender.`);
      return;
    }
    const existing = cart.find((line) => line.product.id === product.id);
    if (existing) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLInputElement>(`[data-weight-input="${product.id}"]`)?.focus(),
      );
      return;
    }
    setWeightProduct(product);
    setWeightValue("");
    setWeightError(null);
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>("[data-pending-weight]")?.focus());
  }

  function applyWeight(product: Product, value: string) {
    if (!isValidWeight(value)) {
      setWeightError("Ingresá un peso mayor a cero con hasta tres decimales.");
      return;
    }
    const calculatedPrice = calculateWeightedPrice(value, product.price_per_kg!);
    setCart((lines) => {
      const existing = lines.find((line) => line.product.id === product.id);
      if (existing) {
        return lines.map((line) =>
          line.product.id === product.id
            ? { ...line, weight: value, calculatedPrice, actualPrice: undefined }
            : line,
        );
      }
      return [...lines, { product, quantity: 0, weight: value, calculatedPrice }];
    });
    setWeightProduct(null);
    setWeightValue("");
    setWeightError(null);
    setConfirmedSale(null);
    setScanError(null);
    setTotalFlash((n) => n + 1);
  }

  function updateLineWeight(product: Product, value: string) {
    if (!isValidWeight(value)) {
      setWeightError(`Ingresá un peso mayor a cero con hasta tres decimales.`);
      setCart((lines) =>
        lines.map((line) =>
          line.product.id === product.id ? { ...line, weight: value } : line,
        ),
      );
      return;
    }
    setWeightError(null);
    setCart((lines) =>
      lines.map((line) =>
        line.product.id === product.id
          ? {
              ...line,
              weight: value,
              calculatedPrice: calculateWeightedPrice(value, product.price_per_kg!),
              actualPrice: undefined,
            }
          : line,
      ),
    );
    setTotalFlash((n) => n + 1);
  }

  function openActualPrice(line: CartLine) {
    const calculated = line.calculatedPrice ?? fromCents(toCents(line.product.price) * line.quantity);
    setEditingPriceProductId(line.product.id);
    setActualPriceDraft(line.actualPrice ?? calculated);
    requestAnimationFrame(() => actualPriceRef.current?.focus());
  }

  function closeActualPrice() {
    setEditingPriceProductId(null);
    setActualPriceDraft("");
    refocus();
  }

  function saveActualPrice(productId: string) {
    if (!isMoneyAmount(actualPriceDraft)) {
      setScanError("Ingresá un precio real válido con hasta dos decimales.");
      return;
    }
    setCart((lines) =>
      lines.map((line) =>
        line.product.id === productId
          ? { ...line, actualPrice: actualPriceDraft }
          : line,
      ),
    );
    closeActualPrice();
  }

  // Every way of dismissing the confirmation modal — auto-dismiss, the
  // close button, "Nueva venta", or clicking the backdrop — ends with focus
  // back on the scan field, not just wherever the dismissing click landed
  // (pos-patterns.md: "el foco vuelve al campo de escaneo").
  const dismissConfirmedSale = useCallback(() => {
    setConfirmedSale(null);
    refocus();
  }, [refocus]);

  // Auto-dismiss timer. The other dismissal paths (close button, "Nueva
  // venta", click on the backdrop) are onClick handlers in the JSX below —
  // all of them call dismissConfirmedSale() above.
  useEffect(() => {
    if (!confirmedSale) return;
    const timer = setTimeout(
      dismissConfirmedSale,
      CONFIRMED_SALE_AUTO_DISMISS_MS,
    );
    return () => clearTimeout(timer);
  }, [confirmedSale, dismissConfirmedSale]);

  async function scan(event: FormEvent) {
    event.preventDefault();
    const code = barcode.trim();
    if (!code || pending) return;
    setScanError(null);
    let keepWeightFocus = false;
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
      keepWeightFocus = product.unit_type === "pesable";
    } catch (e) {
      const err = e as ApiError;
      setScanError(
        err.status === 404
          ? `No hay ningún producto con el código ${code}. Verificá el código o cargalo en Productos.`
          : err.message,
      );
    } finally {
      if (!keepWeightFocus) refocus();
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
    if (product.unit_type === "pesable") {
      beginWeightEntry(product);
      return;
    }
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
    if (line.product.unit_type === "pesable") return;
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
      // The POS filters this catalog locally for scan-free lookup. Load the
      // full kiosk-sized catalog instead of the backend's default page of 20;
      // otherwise products beyond the first page cannot be found here.
      const list = await api<ProductList>("/products?limit=100");
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
    if (product.unit_type !== "pesable") refocus();
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const target = searchResults[activeResultIndex] ?? searchResults[0];
    if (target) pickSearchResult(target);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSearchDismissed(true);
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
    const removing = quantity <= 0;
    // Only a removal moves focus deliberately (pos-patterns.md): to the
    // sibling line that took this one's place, or to the scan field if the
    // cart emptied out. A plain +/- keeps focus on the button the cashier
    // is already using, so repeated clicks/Enter keep working in place.
    let nextFocusProductId: string | null = null;
    if (removing) {
      const index = cart.findIndex((l) => l.product.id === productId);
      const remaining = cart.filter((l) => l.product.id !== productId);
      if (remaining.length > 0) {
        nextFocusProductId =
          remaining[Math.min(index, remaining.length - 1)].product.id;
      }
    }
    setCart((lines) =>
      removing
        ? lines.filter((l) => l.product.id !== productId)
        : lines.map((l) =>
            l.product.id === productId ? { ...l, quantity } : l,
          ),
    );
    setTotalFlash((n) => n + 1);
    if (!removing) return;
    if (nextFocusProductId) {
      const focusTarget = nextFocusProductId;
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>(
            `[data-line-decrement="${focusTarget}"]`,
          )
          ?.focus();
      });
    } else {
      refocus();
    }
  }

  const totalCents = cart.reduce((sum, line) => {
    const calculated =
      line.calculatedPrice ?? fromCents(toCents(line.product.price) * line.quantity);
    return sum + toCents(effectiveLinePrice(calculated, line.actualPrice));
  }, 0);
  const saleTotal = fromCents(totalCents);
  const itemCount = cart.length;

  function selectPaymentMethod(method: SplitPaymentMethod) {
    setPayment(method);
    if (splitPayments && method !== "TRANSFER") {
      setSplitPayments(
        composeSplitPayment(saleTotal, method, splitPayments[0].amount),
      );
    }
  }

  function startSplitPayment() {
    if (payment === "TRANSFER") return;
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

  const paymentPayload =
    splitPayments ?? (payment ? [{ method: payment, amount: saleTotal }] : []);
  const cashPayment = paymentPayload.find(
    (paymentInput) => paymentInput.method === "CASH",
  );
  const cashChangeCents =
    cashPayment && isMoneyAmount(cashReceived)
      ? toCents(cashReceived) - toCents(cashPayment.amount)
      : null;
  const paymentBalance = getPaymentBalance(saleTotal, paymentPayload);
  const hasBalancedPayments =
    paymentBalance.hasValidAmounts && paymentBalance.differenceCents === 0;
  const balanceMessage = !payment
    ? `Falta ${formatMoney(saleTotal)}`
    : !paymentBalance.hasNumericAmounts
      ? "Ingresá importes válidos mayores a cero"
      : paymentBalance.differenceCents > 0
        ? `Falta ${formatMoney(fromCents(paymentBalance.differenceCents))}`
        : paymentBalance.differenceCents < 0
          ? `Sobra ${formatMoney(fromCents(-paymentBalance.differenceCents))}`
          : !paymentBalance.hasValidAmounts
            ? "Cada pago debe ser mayor a cero"
            : "Pago cerrado";
  const confirmDisabledReason =
    cart.length === 0
      ? "Agregá al menos un producto"
      : cart.some(
            (line) =>
              line.product.unit_type === "pesable" &&
              (!line.weight || !isValidWeight(line.weight)),
          )
        ? "Ingresá un peso válido"
      : !payment
        ? "Elegí un medio de pago"
        : !hasBalancedPayments
          ? "Resolvé el balance de pagos"
          : null;

  // One-shot pulse the instant the sale becomes payable (disabled → enabled),
  // not on every render while it stays enabled. The color/label already
  // carry the state; this is a decorative reinforcement layered on top —
  // see the `.confirm-ready` comment in globals.css for why it's safe to
  // drop under reduced motion.
  const [confirmReady, setConfirmReady] = useState(false);
  const prevConfirmDisabledReason = useRef(confirmDisabledReason);
  useEffect(() => {
    const wasDisabled = prevConfirmDisabledReason.current;
    prevConfirmDisabledReason.current = confirmDisabledReason;
    if (wasDisabled && !confirmDisabledReason) {
      setConfirmReady(true);
      const timer = setTimeout(() => setConfirmReady(false), MOTION.base);
      return () => clearTimeout(timer);
    }
  }, [confirmDisabledReason]);

  async function confirmSale() {
    if (confirmDisabledReason || pending) return;
    setConfirmError(null);
    setUnknownState(false);
    setPending(true);
    const total = formatMoney(saleTotal);
    try {
      const sale = await api<{ id: string }>("/sales", { method: "POST" });
      for (const line of cart) {
        await api(`/sales/${sale.id}/items`, {
          method: "POST",
          body:
            line.product.unit_type === "pesable"
              ? {
                  product_id: line.product.id,
                  weight: line.weight,
                  ...(line.actualPrice ? { actual_price: line.actualPrice } : {}),
                }
              : { product_id: line.product.id, quantity: line.quantity },
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
      window.dispatchEvent(new Event(CASH_CLOSING_STATUS_CHANGED));
      // No toast here: el panel de confirmación de abajo ya es la
      // confirmación (con número y total) y comparte la esquina con el
      // toast — dos "Venta confirmada" superpuestos en el mismo lugar.
      setConfirmedSale({
        id: sale.id,
        total,
        saleNumber: confirmed.sale_number ?? null,
      });
      setCart([]);
      setPayment(null);
      setSplitPayments(null);
      setCashReceived("");
      setShowCashChange(false);
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_23rem]">
      <div className={`flex flex-col gap-4 ${cart.length > 0 ? "pb-28 md:pb-0" : ""}`}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <form onSubmit={scan}>
          <label htmlFor="scan" className="mb-1.5 block text-sm font-medium">
            Escaneá o ingresá un código de barras
          </label>
          <div className="relative">
            <IconBarcode className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary/70" />
            <input
              id="scan"
              ref={scanRef}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              autoFocus
              autoComplete="off"
              placeholder="Código de barras"
              className="data h-12 w-full rounded-app border-2 border-border bg-surface pl-12 pr-4 text-base shadow-soft placeholder:font-sans placeholder:text-text-disabled hover:border-border-hover focus:border-primary"
            />
          </div>
        </form>

        <div className="relative z-20">
          <form onSubmit={submitSearch}>
            <label
              htmlFor="pos-search"
              className="mb-1.5 block text-sm font-medium"
            >
              ¿Sin código? Buscá el producto por nombre
            </label>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <input
                id="pos-search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setActiveResultIndex(0);
                  setSearchDismissed(false);
                  if (e.target.value.trim()) void loadCatalog();
                }}
                onKeyDown={handleSearchKeyDown}
                autoComplete="off"
                placeholder="Nombre o SKU del producto"
                role="combobox"
                aria-expanded={!searchDismissed && searchResults.length > 0}
                aria-controls="pos-search-results"
                aria-activedescendant={
                  searchResults[activeResultIndex]
                    ? `pos-search-result-${searchResults[activeResultIndex].id}`
                    : undefined
                }
                className="h-11 w-full rounded-app border border-border bg-surface pl-9 pr-4 shadow-soft placeholder:text-text-disabled hover:border-border-hover focus:border-primary"
              />
            </div>
          </form>

          {catalogError && searchTerm.trim() && (
            <p className="mt-2 text-sm text-error">
              No se pudo cargar el catálogo: {catalogError}. Escribí de nuevo
              para reintentar.
            </p>
          )}

          {searchTerm.trim() && !catalogError && !searchDismissed && (
            <ul
              id="pos-search-results"
              className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-app border border-border bg-surface shadow-soft"
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
                      className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover focus-visible:bg-surface-hover ${
                        index === activeResultIndex ? "bg-surface-hover" : ""
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
                        {formatMoney(p.unit_type === "pesable" ? p.price_per_kg ?? "0.00" : p.price)}
                        {p.unit_type === "pesable" && "/kg"}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        </div>

        {scanError && (
          <div
            role="alert"
            className="rounded-app border border-error/40 bg-error/10 px-4 py-3 text-sm font-medium text-error"
          >
            {scanError}
          </div>
        )}

        {weightProduct && (
          <Card className="border-primary-light bg-primary-light/30">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-medium">Peso de {weightProduct.name}</p>
                <p className="text-sm text-text-secondary">
                  Precio por kilo: {formatMoney(weightProduct.price_per_kg!)}
                </p>
              </div>
              <div className="flex-1 sm:max-w-52">
                <Input
                  label="Peso (kg)"
                  data-pending-weight
                  value={weightValue}
                  onChange={(event) => setWeightValue(event.target.value)}
                  onBlur={() => applyWeight(weightProduct, weightValue)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyWeight(weightProduct, weightValue);
                    }
                    if (event.key === "Escape") {
                      setWeightProduct(null);
                      setWeightValue("");
                      setWeightError(null);
                      refocus();
                    }
                  }}
                  inputMode="decimal"
                  placeholder="0.000"
                  error={weightError ?? undefined}
                />
              </div>
            </div>
          </Card>
        )}

        {cart.length === 0 ? (
          <EmptyState message="El carrito está vacío. Escaneá un producto para empezar la venta." />
        ) : (
          <Card className="p-0">
            {/* Line order stays stable — no reorder animation, per
                pos-patterns.md ("El carrito no usa AutoAnimate ni una layout
                animation para reordenar"). Add/increment is signaled by
                `.flash` alone (color, CSS, survives reduced motion); removal
                has no layout animation, it just disappears. The <li> key
                stays the product id so React reuses the DOM node on a
                quantity bump instead of remounting it. */}
            <ul>
              {cart.map((line) => (
                <li
                  key={line.product.id}
                  className="border-b border-border last:border-b-0"
                >
                  <div
                    key={
                      flash?.id === line.product.id
                        ? `flash-${flash.nonce}`
                        : "static"
                    }
                    className={`${
                      line.product.unit_type === "unitario"
                        ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-3 py-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:gap-x-3 lg:px-4"
                        : "flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 lg:px-4"
                    } transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
                      flash?.id === line.product.id ? "flash" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate font-medium">
                        {line.product.name}
                      </p>
                      <p className="num text-sm text-text-secondary">
                        {line.product.unit_type === "pesable"
                          ? `${formatMoney(line.product.price_per_kg!)} /kg`
                          : `${formatMoney(line.product.price)} c/u`}
                      </p>
                    </div>
                    {line.product.unit_type === "pesable" ? (
                      <Input
                        label="Peso (kg)"
                        inline
                        data-weight-input={line.product.id}
                        value={line.weight ?? ""}
                        onChange={(event) => updateLineWeight(line.product, event.target.value)}
                        inputMode="decimal"
                        className="w-36"
                        error={weightError ?? undefined}
                      />
                    ) : (
                      <div className="flex items-center rounded-app border border-border bg-surface">
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          iconOnly
                          aria-label={`Restar uno a ${line.product.name}`}
                          data-line-decrement={line.product.id}
                          onClick={() => setQuantity(line.product.id, line.quantity - 1)}
                          className="rounded-l-app rounded-r-none text-text-secondary hover:bg-surface-2 focus-visible:relative focus-visible:z-10"
                        >
                          <IconMinus className="size-3.5" />
                        </Button>
                        <span className="num flex h-11 w-10 items-center justify-center border-x border-border text-sm font-semibold md:h-10">
                          {line.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          iconOnly
                          aria-label={`Sumar uno a ${line.product.name}`}
                          onClick={() => incrementQuantity(line)}
                          className="rounded-l-none rounded-r-app text-text-secondary hover:bg-surface-2 focus-visible:relative focus-visible:z-10"
                        >
                          <IconPlus className="size-3.5" />
                        </Button>
                      </div>
                    )}
                    <p className="num w-24 justify-self-end text-right text-base font-semibold">
                      {formatMoney(effectiveLinePrice(
                        line.calculatedPrice ?? fromCents(toCents(line.product.price) * line.quantity),
                        line.actualPrice,
                      ))}
                    </p>
                    {line.product.unit_type === "pesable" && editingPriceProductId === line.product.id ? (
                      <div className="flex items-end gap-2">
                        <Input
                          ref={actualPriceRef}
                          label="Precio real"
                          value={actualPriceDraft}
                          onChange={(event) => setActualPriceDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveActualPrice(line.product.id);
                            if (event.key === "Escape") closeActualPrice();
                          }}
                          inputMode="decimal"
                          className="w-28"
                        />
                        <Button type="button" size="sm" onClick={() => saveActualPrice(line.product.id)}>Aplicar</Button>
                      </div>
                    ) : line.product.unit_type === "pesable" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Editar precio real de ${line.product.name}`}
                        title={`Editar precio real de ${line.product.name}`}
                        onClick={() => openActualPrice(line)}
                      >
                        <IconEdit className="size-4" />
                      </Button>
                    ) : null}
                    {line.actualPrice && <span className="text-xs text-text-secondary">Editado</span>}
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Quitar ${line.product.name}`}
                      title={`Quitar ${line.product.name}`}
                      className="ml-auto text-error hover:!bg-error/10 focus-visible:!text-error"
                      onClick={() => setQuantity(line.product.id, 0)}
                    >
                      <IconTrash className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Card className="h-fit border-primary-light bg-surface-raised shadow-soft-lg md:sticky md:top-6">
        <h2 className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">
          Total
        </h2>
        <div
          className="mb-6 hidden flex-col items-center justify-center gap-1 rounded-app bg-primary-light/40 py-4 md:flex"
          aria-live="polite"
          aria-atomic="true"
        >
          <p
            key={totalFlash}
            className={`num whitespace-nowrap text-center text-4xl font-bold tracking-tight sm:text-5xl ${
              totalFlash > 0 ? "total-flash" : ""
            }`}
          >
            {formatMoney(fromCents(totalCents))}
          </p>
          <p className="text-sm text-text-secondary">
            {itemCount} producto{itemCount === 1 ? "" : "s"}
          </p>
        </div>

        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-medium">
            {splitPayments ? "Pagos divididos" : "Método de pago"}
          </legend>
          <div
            className={
              splitPayments
                ? "grid grid-cols-2 gap-2"
                : "grid grid-cols-[1fr_1fr_1.3fr] gap-2"
            }
          >
            {(splitPayments
              ? PAYMENT_OPTIONS.filter(([value]) => value !== "TRANSFER")
              : PAYMENT_OPTIONS
            ).map(([value, label]) => {
              const PaymentIcon = PAYMENT_ICONS[value];
              return (
                <label
                  key={value}
                  className={`group flex cursor-pointer flex-col items-center gap-1 rounded-app border px-2 py-3 text-center text-sm font-medium transition-[background-color,border-color,color,transform] duration-[var(--motion-fast)] ease-[var(--ease-standard)] active:scale-[0.98] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
                    payment === value
                      ? PAYMENT_SELECTED_STYLES[value]
                      : `border-border text-text-secondary ${PAYMENT_HOVER_STYLES[value]}`
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
                  <span
                    className={`flex size-8 items-center justify-center rounded-tight ${
                      payment === value
                        ? "text-text-primary"
                        : "text-text-secondary"
                    }`}
                  >
                    <PaymentIcon className="size-5" />
                  </span>
                  {label}
                </label>
              );
            })}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {splitPayments ? (
              <motion.div
                key="split-panel"
                initial={panelTransition.initial}
                animate={panelTransition.animate}
                exit={panelTransition.exit}
                transition={panelTransition.transition}
                className="mt-3 flex flex-col gap-3 rounded-app border border-border bg-surface-2 p-3"
              >
                <Input
                  ref={splitAmountRef}
                  label={`${PAYMENT_LABELS[splitPayments[0].method]} (importe)`}
                  value={splitPayments[0].amount}
                  onChange={(event) => updateSplitAmount(event.target.value)}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                />
                <div className="rounded-app border border-border bg-surface px-3.5 py-2.5">
                  <p className="text-sm font-medium">
                    {PAYMENT_LABELS[splitPayments[1].method]}
                  </p>
                  <p className="num mt-1 text-lg font-semibold">
                    {splitPayments[1].amount
                      ? formatMoney(splitPayments[1].amount)
                      : "—"}
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
              </motion.div>
            ) : payment !== "TRANSFER" ? (
              <motion.div
                key="split-button"
                initial={panelTransition.initial}
                animate={panelTransition.animate}
                exit={panelTransition.exit}
                transition={panelTransition.transition}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3 gap-1.5"
                  disabled={cart.length === 0}
                  onClick={startSplitPayment}
                >
                  <IconSplit className="size-4" />
                  Dividir pago
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {cashPayment && (
            <div className="mt-3">
              <AnimatePresence mode="wait" initial={false}>
                {showCashChange ? (
                  <motion.div
                    key="cash-change-panel"
                    initial={panelTransition.initial}
                    animate={panelTransition.animate}
                    exit={panelTransition.exit}
                    transition={panelTransition.transition}
                    className="flex flex-col gap-2 rounded-app border border-border bg-surface-2 p-3"
                  >
                    <Input
                      ref={cashReceivedRef}
                      label="Efectivo entregado"
                      value={cashReceived}
                      onChange={(event) => setCashReceived(event.target.value)}
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                    />
                    {cashChangeCents !== null && (
                      <p
                        className={`text-sm font-medium ${
                          cashChangeCents >= 0 ? "text-success" : "text-warning"
                        }`}
                      >
                        {cashChangeCents >= 0
                          ? `Vuelto ${formatMoney(fromCents(cashChangeCents))}`
                          : `Faltan ${formatMoney(fromCents(-cashChangeCents))}`}
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="cash-change-button"
                    initial={panelTransition.initial}
                    animate={panelTransition.animate}
                    exit={panelTransition.exit}
                    transition={panelTransition.transition}
                  >
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setShowCashChange(true);
                        requestAnimationFrame(() =>
                          cashReceivedRef.current?.focus(),
                        );
                      }}
                    >
                      <IconCalculator className="size-4" />
                      Calcular vuelto
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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

        {cart.length > 0 && (!hasBalancedPayments || splitPayments) && (
          <p
            aria-live="polite"
            aria-atomic="true"
            className={`mb-2 rounded-app border px-3 py-2 text-center text-sm font-medium ${
              hasBalancedPayments
                ? "border-success/40 bg-success/10 text-text-primary"
                : "border-warning/40 bg-warning/10 text-text-primary"
            }`}
          >
            {balanceMessage}
          </p>
        )}

        {confirmDisabledReason && (
          <p className="mb-2 text-center text-xs text-text-secondary">
            {confirmDisabledReason}
          </p>
        )}
        <Button
          variant="confirm"
          className={`hidden w-full py-3.5 text-base md:flex ${confirmReady ? "confirm-ready" : ""}`}
          disabled={!!confirmDisabledReason}
          pending={pending}
          pendingImmediate
          onClick={confirmSale}
        >
          {pending ? "Confirmando…" : "Confirmar venta"}
        </Button>
      </Card>

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t border-border bg-surface-raised p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-soft-lg md:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Total</p>
            <p className="num truncate text-xl font-bold" aria-live="polite">{formatMoney(fromCents(totalCents))}</p>
          </div>
          <Button
            variant="confirm"
            className={`shrink-0 py-3 text-base ${confirmReady ? "confirm-ready" : ""}`}
            disabled={!!confirmDisabledReason}
            pending={pending}
            pendingImmediate
            onClick={confirmSale}
          >
            {pending ? "Confirmando…" : "Confirmar venta"}
          </Button>
        </div>
      )}

      {/* Deliberately not a real a11y modal (no aria-modal, no focus trap):
          pos-patterns.md requires that confirming a sale never blocks the
          start of the next one, and confirmSale()'s refocus() already put
          the cursor back in the scan field before this even mounts. The
          backdrop only blocks the mouse — typing/scanning keeps working
          right under it. role="status" (not "dialog") reflects that: this
          announces a result, it doesn't ask for input. */}
      <AnimatePresence>
        {confirmedSale && (
          <motion.div
            key="confirmed-sale-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4"
            onClick={dismissConfirmedSale}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: {
                duration: MOTION.fast / 1000,
                ease: [0.4, 0, 0.2, 1] as const,
              },
            }}
            transition={{ duration: MOTION.base / 1000 }}
          >
            <motion.div
              role="status"
              aria-live="polite"
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-sm overflow-hidden rounded-app border border-success/30 bg-surface-raised shadow-soft-lg"
              initial={{
                opacity: 0,
                scale: shouldReduceMotion ? 1 : 0.96,
              }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{
                opacity: 0,
                scale: shouldReduceMotion ? 1 : 0.98,
                transition: {
                  duration: MOTION.fast / 1000,
                  ease: [0.4, 0, 0.2, 1] as const,
                },
              }}
              transition={{
                duration: MOTION.base / 1000,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
            >
              <button
                type="button"
                aria-label="Cerrar"
                onClick={dismissConfirmedSale}
                className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-tight text-text-muted transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover hover:text-text-primary"
              >
                <IconX className="size-4.5" />
              </button>

              <div className="flex flex-col items-center gap-4 px-8 pb-8 pt-10 text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-success/12">
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-success"
                    />
                    {/* pathLength={1} normalizes the path's length to 1 so
                        the stroke-dasharray/dashoffset draw trick
                        (.check-draw, globals.css) doesn't need the actual
                        SVG path length computed by hand. */}
                    <path
                      d="M6 10.5L8.5 13L14 7.5"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={1}
                      className="check-draw text-success"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <div>
                  <p className="text-base font-semibold text-success">
                    Venta confirmada
                  </p>
                  {confirmedSale.saleNumber !== null && (
                    <p className="num select-text text-5xl font-bold tracking-tight text-text-primary">
                      #{confirmedSale.saleNumber}
                    </p>
                  )}
                  <p className="num mt-1 text-xl font-semibold text-text-secondary">
                    {confirmedSale.total}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2">
                  <Button onClick={dismissConfirmedSale}>Nueva venta</Button>
                  <Link
                    href={`/sales/${confirmedSale.id}`}
                    className="text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    Ver detalle →
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
