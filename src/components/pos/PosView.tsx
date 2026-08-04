"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/states";
import { api, ApiError, type ErrorKind } from "@/lib/api";
import { CASH_CLOSING_STATUS_CHANGED } from "@/lib/cashClosing";
import { fromCents, toCents, formatMoney } from "@/lib/money";
import { isValidWeight, weightThousandths } from "@/lib/weightPricing";
import { formatStockQuantity, stockLimitMessageKg } from "@/lib/inventory";
import {
  addEmptyWeightLine,
  addOrIncrementUnitLine,
  applyStockCap,
  cartTotalCents,
  summarizeCart,
  updateLineWeight,
  type CartLine,
} from "@/lib/cart";
import { resolveCheckoutStatus, resolveEntryStatus } from "@/lib/posStatus";
import { submitSale } from "@/lib/posSaleSubmission";
import {
  composeSplitPayment,
  getPaymentBalance,
  isMoneyAmount,
  type SplitPaymentInput,
  type SplitPaymentMethod,
} from "@/lib/paymentComposition";
import { Product, ProductList, Sale, Stock } from "@/lib/types";
import { ScanOmnibox } from "@/components/pos/ScanOmnibox";
import { CartLines } from "@/components/pos/CartLines";
import { CheckoutPanel } from "@/components/pos/CheckoutPanel";
import { CheckoutStatus } from "@/components/pos/CheckoutStatus";
import { ClearCartDialog } from "@/components/pos/ClearCartDialog";
import { ConfirmedSalePanel } from "@/components/pos/ConfirmedSalePanel";
import { MOTION } from "@/lib/motion";

// Auto-dismiss delay for the post-sale confirmation panel. Not just a Toast
// (4s): this one also shows the sale number, total and a "Ver detalle" link,
// so it gets more time to read (~50ms/word floor, states-feedback.md) before
// it clears itself. Never gates the next sale either way — closing early
// (button, click outside) or scanning the next product both dismiss it.
const CONFIRMED_SALE_AUTO_DISMISS_MS = 6000;

const POS_CART_STORAGE_KEY = "pos:cart:v1";

const UNKNOWN_NETWORK_MESSAGE =
  "Falló la conexión y no se sabe si la venta se confirmó. Verificá el estado antes de reintentar; el carrito se conservó.";

export function PosView() {
  const shouldReduceMotion = useReducedMotion();
  const scanRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const splitAmountRef = useRef<HTMLInputElement>(null);
  const cashReceivedRef = useRef<HTMLInputElement>(null);
  // Guards a second Enter/selection while a scan or search-pick request is
  // still in flight (design.md, Decisión 1) — deliberately separate from
  // `pending`, which only gates the confirmation button.
  const scanInFlightRef = useRef(false);
  const hydratedRef = useRef(false);

  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<SplitPaymentMethod | null>(null);
  const [splitPayments, setSplitPayments] = useState<
    SplitPaymentInput[] | null
  >(null);
  const [cashReceived, setCashReceived] = useState("");

  // Entry region (design.md, Decisión 10): each of these is a candidate
  // fed into `resolveEntryStatus`, never rendered independently.
  const [unknownBarcodeMessage, setUnknownBarcodeMessage] = useState<
    string | null
  >(null);
  const [inactiveProductMessage, setInactiveProductMessage] = useState<
    string | null
  >(null);
  const [stockLimitMsg, setStockLimitMsg] = useState<string | null>(null);
  const [catalogErrorMessage, setCatalogErrorMessage] = useState<string | null>(
    null,
  );

  // Checkout region candidates (design.md, Decisión 10).
  const [confirmErrorMessage, setConfirmErrorMessage] = useState<string | null>(
    null,
  );
  const [confirmErrorKind, setConfirmErrorKind] = useState<ErrorKind | null>(
    null,
  );
  const [unknownNetworkState, setUnknownNetworkState] = useState(false);
  const [pending, setPending] = useState(false);
  // Retains the sale id already created by a previous attempt so a retry
  // never duplicates the draft (design.md, Decisión 12).
  const [retainedSaleId, setRetainedSaleId] = useState<string | null>(null);

  const [clearCartDialogOpen, setClearCartDialogOpen] = useState(false);

  // flash: product id + a nonce so repeated scans retrigger the animation
  const [flash, setFlash] = useState<{ id: string; nonce: number } | null>(
    null,
  );
  const [confirmedSale, setConfirmedSale] = useState<{
    id: string;
    total: string;
    saleNumber: number | null;
  } | null>(null);
  // Persists after `confirmedSale` is dismissed/auto-dismissed (design.md,
  // Decisión 20) — the cashier can still see the last sale's number after
  // the modal panel is gone. Replaced by each new successful confirmation;
  // never accumulates a history and isn't persisted to `sessionStorage`.
  const [lastConfirmedSale, setLastConfirmedSale] = useState<{
    id: string;
    total: string;
    saleNumber: number | null;
  } | null>(null);

  const [totalFlash, setTotalFlash] = useState(0);
  // manual search: lazy-loaded catalog, filtered client-side (no search endpoint yet)
  const [searchTerm, setSearchTerm] = useState("");
  const [catalog, setCatalog] = useState<Product[] | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [searchDismissed, setSearchDismissed] = useState(false);
  const catalogRequested = useRef(false);
  // Stock available per product, fetched lazily the first time it's needed
  // and cached — the cart quantity is capped against it so a cashier can
  // never sell more than what's actually in inventory.
  const stockByProduct = useRef<Record<string, number | undefined>>({});
  const stockRequests = useRef<
    Record<string, Promise<number | undefined> | undefined>
  >({});

  async function availableStock(
    productId: string,
  ): Promise<number | undefined> {
    if (productId in stockByProduct.current)
      return stockByProduct.current[productId];
    if (stockRequests.current[productId])
      return stockRequests.current[productId];
    const request = api<Stock>(`/inventory/stock/${productId}`)
      .then((stock) => stock.quantity)
      .catch(() => undefined)
      .then((quantity) => {
        // Unknown stock never blocks a scan — the backend remains the
        // authority and rejects an over-sell at confirm time regardless.
        stockByProduct.current[productId] = quantity;
        return quantity;
      })
      .finally(() => {
        delete stockRequests.current[productId];
      });
    stockRequests.current[productId] = request;
    return request;
  }

  const refocus = useCallback(() => {
    setBarcode("");
    // defer so the focus lands after React re-renders and after the browser's
    // default focus handling on the clicked element
    requestAnimationFrame(() => scanRef.current?.focus());
  }, []);

  // Hydrate cart + payment from a previous tab session (design.md, Decisión
  // 18). Runs once, after mount — sessionStorage isn't available during the
  // server render, and this deliberately never fires again afterwards, so it
  // never clobbers an in-progress edit with a stale snapshot.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const raw = sessionStorage.getItem(POS_CART_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        cart?: CartLine[];
        payment?: SplitPaymentMethod | null;
      };
      if (Array.isArray(parsed.cart) && parsed.cart.length > 0) {
        // Reading sessionStorage is a genuine post-mount effect (it's
        // unavailable during the server render — design.md, "Migration
        // Plan" §5), not state derived from a prop/earlier render, so the
        // usual "adjust state during render" alternative doesn't apply here.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCart(parsed.cart);
      }
      if (parsed.payment) setPayment(parsed.payment);
    } catch {
      // Corrupted or unavailable storage — start empty, same as today.
    }
  }, []);

  // Persist cart + payment only (never splitPayments/cashReceived — design.md,
  // Decisión 18). An empty cart clears the key, which also covers "limpiar al
  // confirmar / al vaciar" (Decisión 18, punto 4.4) since both paths empty the
  // cart.
  useEffect(() => {
    try {
      if (cart.length === 0) {
        sessionStorage.removeItem(POS_CART_STORAGE_KEY);
        return;
      }
      sessionStorage.setItem(
        POS_CART_STORAGE_KEY,
        JSON.stringify({ cart, payment }),
      );
    } catch {
      // sessionStorage unavailable (private mode, quota) — non-fatal.
    }
  }, [cart, payment]);

  // "Efectivo" preselected the first time the cart goes from empty to
  // non-empty (design.md, Decisión 7) — never reimposed once the cashier has
  // chosen or changed the method.
  const prevCartLengthRef = useRef(cart.length);
  useEffect(() => {
    if (
      prevCartLengthRef.current === 0 &&
      cart.length > 0 &&
      payment === null
    ) {
      setPayment("CASH");
    }
    prevCartLengthRef.current = cart.length;
  }, [cart.length, payment]);

  // Every way of dismissing the confirmation modal — auto-dismiss, the
  // close button, "Nueva venta", or clicking the backdrop — ends with focus
  // back on the scan field, not just wherever the dismissing click landed
  // (pos-patterns.md: "el foco vuelve al campo de escaneo").
  const dismissConfirmedSale = useCallback(() => {
    setConfirmedSale(null);
    refocus();
  }, [refocus]);

  // Auto-dismiss timer. The other dismissal paths (close button, "Nueva
  // venta", click on the backdrop) call dismissConfirmedSale() directly.
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
    if (!code || scanInFlightRef.current) return;
    scanInFlightRef.current = true;
    setUnknownBarcodeMessage(null);
    let keepWeightFocus = false;
    try {
      const product = await api<Product>(
        `/products/barcode/${encodeURIComponent(code)}`,
      );
      if (!product.active) {
        setInactiveProductMessage(
          `“${product.name}” está inactivo y no se puede vender. Activalo en Productos si corresponde.`,
        );
        return;
      }
      await addToCart(product);
      keepWeightFocus = product.unit_type === "pesable";
    } catch (e) {
      const err = e as ApiError;
      setUnknownBarcodeMessage(
        err.status === 404
          ? `No hay ningún producto con el código ${code}. Verificá el código o cargalo en Productos.`
          : err.message,
      );
    } finally {
      scanInFlightRef.current = false;
      if (!keepWeightFocus) refocus();
    }
  }

  async function addToCart(product: Product) {
    if (product.unit_type === "pesable") {
      if (!product.price_per_kg || !isMoneyAmount(product.price_per_kg)) {
        setInactiveProductMessage(
          `“${product.name}” no tiene un precio por kilo válido y no se puede vender.`,
        );
        return;
      }
      setConfirmedSale(null);
      setInactiveProductMessage(null);
      setCart((prev) => addEmptyWeightLine(prev, product));
      void availableStock(product.id);
      // A single line always exists for this product by now (either it was
      // already there, or it was just added) — one UI for pesables, no
      // separate panel (design.md, Decisión 5).
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLInputElement>(
            `[data-weight-input="${product.id}"]`,
          )
          ?.focus(),
      );
      return;
    }

    setConfirmedSale(null);
    setInactiveProductMessage(null);
    setCart((prev) => addOrIncrementUnitLine(prev, product));
    setFlash((f) => ({ id: product.id, nonce: (f?.nonce ?? 0) + 1 }));
    setTotalFlash((n) => n + 1);

    // Stock is resolved in parallel, never awaited before the line is
    // visible (design.md, Decisión 2). The cap is applied against the cart
    // as it stands when the response lands, via the functional update.
    const available = await availableStock(product.id);
    if (available === undefined) return;
    let capMessage: string | null = null;
    setCart((prev) => {
      const result = applyStockCap(prev, product.id, available);
      capMessage = result.message;
      return result.cart;
    });
    if (capMessage) setStockLimitMsg(capMessage);
  }

  async function incrementQuantity(line: CartLine) {
    if (line.product.unit_type === "pesable") return;
    const available = await availableStock(line.product.id);
    if (available !== undefined && line.quantity + 1 > available) {
      setStockLimitMsg(
        `Solo hay ${available} unidad${available === 1 ? "" : "es"} disponible${
          available === 1 ? "" : "s"
        } de “${line.product.name}”.`,
      );
      return;
    }
    setQuantity(line.product.id, line.quantity + 1);
  }

  function decrementQuantity(productId: string) {
    const line = cart.find((l) => l.product.id === productId);
    if (!line) return;
    setQuantity(productId, line.quantity - 1);
  }

  async function loadCatalog() {
    if (catalogRequested.current) return;
    catalogRequested.current = true;
    setCatalogErrorMessage(null);
    try {
      // The POS filters this catalog locally for scan-free lookup. Load the
      // full kiosk-sized catalog instead of the backend's default page of 20;
      // otherwise products beyond the first page cannot be found here.
      const list = await api<ProductList>("/products?limit=100");
      setCatalog(list.products);
    } catch (e) {
      catalogRequested.current = false;
      setCatalogErrorMessage((e as ApiError).message);
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

  const searchStatusMessage = !searchTerm.trim()
    ? null
    : catalog === null
      ? "Buscando…"
      : searchResults.length === 0
        ? `Ningún producto activo coincide con “${searchTerm.trim()}”.`
        : null;

  const entryStatusMessage = resolveEntryStatus({
    unknownBarcodeMessage,
    inactiveProductMessage,
    stockLimitMessage: stockLimitMsg,
    catalogErrorMessage,
    searchStatusMessage,
  });
  const entryStatusIsError =
    entryStatusMessage !== null && entryStatusMessage !== searchStatusMessage;

  async function pickSearchResult(product: Product) {
    if (scanInFlightRef.current) return;
    scanInFlightRef.current = true;
    try {
      await addToCart(product);
      setSearchTerm("");
      if (product.unit_type !== "pesable") refocus();
    } finally {
      scanInFlightRef.current = false;
    }
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

  async function handleWeightChange(productId: string, value: string) {
    const line = cart.find((l) => l.product.id === productId);
    if (!line) return;
    if (isValidWeight(value)) {
      const available = await availableStock(productId);
      if (
        available !== undefined &&
        weightThousandths(value) > weightThousandths(String(available))
      ) {
        setStockLimitMsg(
          stockLimitMessageKg(
            line.product.name,
            formatStockQuantity(available, "pesable"),
          ),
        );
        return;
      }
    }
    setStockLimitMsg(null);
    setCart((prev) =>
      updateLineWeight(prev, productId, value, line.product.price_per_kg!),
    );
    setTotalFlash((n) => n + 1);
  }

  function handleActualPriceChange(
    productId: string,
    value: string | undefined,
  ) {
    setCart((prev) =>
      prev.map((line) =>
        line.product.id === productId ? { ...line, actualPrice: value } : line,
      ),
    );
  }

  const totalCents = cartTotalCents(cart);
  const saleTotal = fromCents(totalCents);
  const summary = summarizeCart(cart);

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

  const paymentPayload = useMemo(
    () =>
      splitPayments ??
      (payment ? [{ method: payment, amount: saleTotal }] : []),
    [splitPayments, payment, saleTotal],
  );
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
  const pendingBalanceMessage =
    cart.length === 0
      ? null
      : !payment
        ? `Falta ${formatMoney(saleTotal)}`
        : !paymentBalance.hasNumericAmounts
          ? "Ingresá importes válidos mayores a cero"
          : paymentBalance.differenceCents > 0
            ? `Falta ${formatMoney(fromCents(paymentBalance.differenceCents))}`
            : paymentBalance.differenceCents < 0
              ? `Sobra ${formatMoney(fromCents(-paymentBalance.differenceCents))}`
              : !paymentBalance.hasValidAmounts
                ? "Cada pago debe ser mayor a cero"
                : null;

  const invalidWeightLine = cart.find(
    (line) =>
      line.product.unit_type === "pesable" &&
      (!line.weight || !isValidWeight(line.weight)),
  );
  const confirmDisabledReason =
    cart.length === 0
      ? "Agregá al menos un producto"
      : invalidWeightLine
        ? `Ingresá un peso válido para “${invalidWeightLine.product.name}”.`
        : !payment
          ? "Elegí un medio de pago"
          : !hasBalancedPayments
            ? "Resolvé el balance de pagos"
            : null;

  const checkoutStatus = resolveCheckoutStatus({
    unknownNetworkState,
    unknownNetworkMessage: UNKNOWN_NETWORK_MESSAGE,
    confirmErrorMessage,
    pendingBalanceMessage,
    confirmDisabledReason,
    settledMessage: "Pago cerrado",
  });

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

  const confirmSale = useCallback(async () => {
    if (confirmDisabledReason || pending) return;
    setConfirmErrorMessage(null);
    setConfirmErrorKind(null);
    setUnknownNetworkState(false);
    setPending(true);
    const total = formatMoney(saleTotal);
    try {
      const confirmed = await submitSale(
        {
          cart,
          paymentPayload,
          existingSaleId: retainedSaleId,
          onSaleCreated: setRetainedSaleId,
        },
        {
          createSale: () => api<{ id: string }>("/sales", { method: "POST" }),
          addSaleItem: (saleId, item) =>
            api(`/sales/${saleId}/items`, { method: "POST", body: item }),
          setSalePayment: (saleId, payments) =>
            api(`/sales/${saleId}/payment`, {
              method: "PUT",
              body: { payments },
            }),
          confirmSale: (saleId) =>
            api<Sale>(`/sales/${saleId}/confirm`, { method: "POST" }),
        },
      );
      window.dispatchEvent(new Event(CASH_CLOSING_STATUS_CHANGED));
      // No toast here: el panel de confirmación de abajo ya es la
      // confirmación (con número y total) y comparte la esquina con el
      // toast — dos "Venta confirmada" superpuestos en el mismo lugar.
      setConfirmedSale({
        id: confirmed.id,
        total,
        saleNumber: confirmed.sale_number ?? null,
      });
      setLastConfirmedSale({
        id: confirmed.id,
        total,
        saleNumber: confirmed.sale_number ?? null,
      });
      setCart([]);
      setPayment(null);
      setSplitPayments(null);
      setCashReceived("");
      setRetainedSaleId(null);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 0) {
        setUnknownNetworkState(true);
      } else {
        setConfirmErrorMessage(err.message);
        setConfirmErrorKind(err.kind);
      }
    } finally {
      setPending(false);
      refocus();
    }
  }, [
    confirmDisabledReason,
    pending,
    saleTotal,
    cart,
    paymentPayload,
    retainedSaleId,
    refocus,
  ]);

  function cancelClearCart() {
    setClearCartDialogOpen(false);
  }

  function confirmClearCart() {
    setCart([]);
    setPayment(null);
    setSplitPayments(null);
    setCashReceived("");
    setRetainedSaleId(null);
    setClearCartDialogOpen(false);
    refocus();
  }

  // Keyboard shortcuts (design.md, Decisión 14). Function keys and
  // modifier combinations only — never a bare letter, which would collide
  // with a screen reader's single-letter navigation mode.
  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "F9") {
        event.preventDefault();
        void confirmSale();
      } else if (event.key === "F3") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "F4") {
        event.preventDefault();
        if (cashPayment) {
          requestAnimationFrame(() => cashReceivedRef.current?.focus());
        }
      } else if (event.key === "F8") {
        event.preventDefault();
        if (cart.length > 0) setClearCartDialogOpen(true);
      } else if (event.altKey && event.key === "1") {
        event.preventDefault();
        selectPaymentMethod("CASH");
      } else if (event.altKey && event.key === "2") {
        event.preventDefault();
        selectPaymentMethod("CARD");
      } else if (event.altKey && event.key === "3") {
        event.preventDefault();
        selectPaymentMethod("TRANSFER");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_23rem]">
      <div
        className={`flex flex-col gap-4 ${cart.length > 0 ? "pb-28 md:pb-0" : ""}`}
      >
        <ScanOmnibox
          barcode={barcode}
          onBarcodeChange={setBarcode}
          onScanSubmit={scan}
          scanInputRef={scanRef}
          searchTerm={searchTerm}
          onSearchTermChange={(value) => {
            setSearchTerm(value);
            setActiveResultIndex(0);
            setSearchDismissed(false);
            if (value.trim()) void loadCatalog();
          }}
          onSearchSubmit={submitSearch}
          onSearchKeyDown={handleSearchKeyDown}
          searchInputRef={searchRef}
          searchResults={searchResults}
          activeResultIndex={activeResultIndex}
          onHoverResult={setActiveResultIndex}
          onPickResult={pickSearchResult}
          searchDismissed={searchDismissed}
          entryStatusMessage={entryStatusMessage}
          entryStatusIsError={entryStatusIsError}
        />

        {cart.length === 0 ? (
          <EmptyState message="El carrito está vacío. Escaneá un producto para empezar la venta." />
        ) : (
          <>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setClearCartDialogOpen(true)}
              >
                Vaciar carrito{" "}
                <span className="text-xs font-normal text-text-muted">
                  (F8)
                </span>
              </Button>
            </div>
            <CartLines
              cart={cart}
              flash={flash}
              onIncrement={incrementQuantity}
              onDecrement={decrementQuantity}
              onRemove={(productId) => setQuantity(productId, 0)}
              onWeightChange={handleWeightChange}
              onActualPriceChange={handleActualPriceChange}
            />
          </>
        )}
      </div>

      <Card className="h-fit border-primary-light bg-surface-raised shadow-soft-lg md:sticky md:top-6">
        <CheckoutPanel
          totalCents={totalCents}
          totalFlash={totalFlash}
          summary={summary}
          payment={payment}
          onSelectPayment={selectPaymentMethod}
          splitPayments={splitPayments}
          onStartSplitPayment={startSplitPayment}
          onStopSplitPayment={() => setSplitPayments(null)}
          onUpdateSplitAmount={updateSplitAmount}
          splitAmountRef={splitAmountRef}
          cartEmpty={cart.length === 0}
          cashPayment={cashPayment}
          cashReceived={cashReceived}
          onCashReceivedChange={setCashReceived}
          cashReceivedRef={cashReceivedRef}
          cashChangeCents={cashChangeCents}
        />

        <CheckoutStatus
          status={checkoutStatus}
          confirmErrorKind={confirmErrorKind}
          onRetry={() => void confirmSale()}
          onGoBack={() => window.history.back()}
        />

        <Button
          variant="confirm"
          className={`hidden w-full py-3.5 text-base md:flex ${confirmReady ? "confirm-ready" : ""}`}
          disabled={!!confirmDisabledReason}
          pending={pending}
          pendingImmediate
          onClick={() => void confirmSale()}
        >
          {pending ? "Confirmando…" : "Confirmar venta"}{" "}
          <span className="text-xs font-normal opacity-80">(F9)</span>
        </Button>

        {lastConfirmedSale && (
          <p className="mt-3 hidden text-center text-sm text-text-secondary md:block">
            Última venta:{" "}
            {lastConfirmedSale.saleNumber !== null && (
              <span className="num font-medium text-text-primary">
                #{lastConfirmedSale.saleNumber}
              </span>
            )}{" "}
            · {lastConfirmedSale.total} ·{" "}
            <Link
              href={`/sales/${lastConfirmedSale.id}`}
              className="font-medium text-primary hover:text-primary-hover"
            >
              Ver
            </Link>
          </p>
        )}
      </Card>

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t border-border bg-surface-raised p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-soft-lg md:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Total
            </p>
            <p className="num truncate text-xl font-bold" aria-live="polite">
              {formatMoney(fromCents(totalCents))}
            </p>
          </div>
          <Button
            variant="confirm"
            className={`shrink-0 py-3 text-base ${confirmReady ? "confirm-ready" : ""}`}
            disabled={!!confirmDisabledReason}
            pending={pending}
            pendingImmediate
            onClick={() => void confirmSale()}
          >
            {pending ? "Confirmando…" : "Confirmar venta"}
          </Button>
        </div>
      )}

      <ClearCartDialog
        open={clearCartDialogOpen}
        lineCount={cart.length}
        onCancel={cancelClearCart}
        onConfirm={confirmClearCart}
      />

      <ConfirmedSalePanel
        confirmedSale={confirmedSale}
        shouldReduceMotion={shouldReduceMotion ?? false}
        onDismiss={dismissConfirmedSale}
      />
    </div>
  );
}
