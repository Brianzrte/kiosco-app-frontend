"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { fromCents, formatMoney, toCents } from "@/lib/money";
import { effectiveLinePrice } from "@/lib/weightPricing";
import { isMoneyAmount } from "@/lib/paymentComposition";
import { MOTION } from "@/lib/motion";
import type { CartLine } from "@/lib/cart";
import {
  IconEdit,
  IconMinus,
  IconPlus,
  IconTrash,
} from "@/components/ui/icons";

const ACTUAL_PRICE_ERROR =
  "Ingresá un precio real válido con hasta dos decimales.";

/**
 * Cart lines with their own scroll container (design.md, Decisión 17) —
 * grows without pushing the rest of the screen once it exceeds its max
 * height, and brings the just-affected line into view instead.
 */
export function CartLines({
  cart,
  flash,
  onIncrement,
  onDecrement,
  onRemove,
  onWeightChange,
  onActualPriceChange,
}: {
  cart: CartLine[];
  flash: { id: string; nonce: number } | null;
  onIncrement: (line: CartLine) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onWeightChange: (productId: string, value: string) => void;
  onActualPriceChange: (productId: string, value: string | undefined) => void;
}) {
  useEffect(() => {
    if (!flash) return;
    document
      .querySelector(`[data-cart-line="${flash.id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [flash]);

  return (
    <Card className="p-0">
      {/* Line order stays stable — no reorder animation, per
          pos-patterns.md ("El carrito no usa AutoAnimate ni una layout
          animation para reordenar"). Add/increment is signaled by `.flash`
          alone; removal has no layout animation, it just disappears. */}
      <ul className="max-h-[28rem] overflow-y-auto">
        {cart.map((line) => (
          <CartLineRow
            key={line.product.id}
            line={line}
            flashed={flash?.id === line.product.id ? flash.nonce : null}
            onIncrement={() => onIncrement(line)}
            onDecrement={() => onDecrement(line.product.id)}
            onRemove={() => onRemove(line.product.id)}
            onWeightChange={(value) => onWeightChange(line.product.id, value)}
            onActualPriceChange={(value) =>
              onActualPriceChange(line.product.id, value)
            }
          />
        ))}
      </ul>
    </Card>
  );
}

function CartLineRow({
  line,
  flashed,
  onIncrement,
  onDecrement,
  onRemove,
  onWeightChange,
  onActualPriceChange,
}: {
  line: CartLine;
  flashed: number | null;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onWeightChange: (value: string) => void;
  onActualPriceChange: (value: string | undefined) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const actualPriceInputRef = useRef<HTMLInputElement>(null);
  const actualPriceToggleRef = useRef<HTMLButtonElement>(null);
  const actualPriceEditorId = useId();
  // "Precio real" is a plain controlled field committed to the cart only
  // when it parses as money (design.md, Decisión 6) — typing an
  // in-progress/invalid value shows its own error below the field without
  // corrupting the total with an unparseable string.
  const [actualPriceDraft, setActualPriceDraft] = useState(
    line.actualPrice ?? "",
  );
  const [actualPriceError, setActualPriceError] = useState<string | null>(null);
  const [actualPriceEditorOpen, setActualPriceEditorOpen] = useState(false);
  // Reset the draft when the committed price is cleared elsewhere (e.g. a
  // weight change clears it) — adjusted during render, same pattern already
  // used by Button.tsx's pending/prevPending, instead of an effect.
  const [prevActualPrice, setPrevActualPrice] = useState(line.actualPrice);
  if (line.actualPrice !== prevActualPrice) {
    setPrevActualPrice(line.actualPrice);
    if (line.actualPrice === undefined) {
      setActualPriceDraft("");
      setActualPriceError(null);
    }
  }

  function handleActualPriceChange(value: string) {
    setActualPriceDraft(value);
    if (value === "") {
      setActualPriceError(null);
      onActualPriceChange(undefined);
      return;
    }
    if (isMoneyAmount(value)) {
      setActualPriceError(null);
      onActualPriceChange(value);
      return;
    }
    setActualPriceError(ACTUAL_PRICE_ERROR);
  }

  function toggleActualPriceEditor() {
    setActualPriceEditorOpen((open) => {
      if (!open) {
        requestAnimationFrame(() => actualPriceInputRef.current?.focus());
      }
      return !open;
    });
  }

  function closeActualPriceEditor() {
    setActualPriceEditorOpen(false);
    requestAnimationFrame(() => actualPriceToggleRef.current?.focus());
  }

  const calculated =
    line.calculatedPrice ??
    fromCents(toCents(line.product.price) * line.quantity);
  // A pesable line with no valid subtotal (empty/invalid weight) never
  // shows a number carried over from a previous weight (design.md,
  // Decisión 4) — it shows an explicit dash instead.
  const hasValidSubtotal =
    line.product.unit_type !== "pesable" || line.calculatedPrice !== undefined;

  return (
    <li
      role="group"
      aria-label={line.product.name}
      data-cart-line={line.product.id}
      className="border-b border-border last:border-b-0"
    >
      <div
        key={flashed !== null ? `flash-${flashed}` : "static"}
        className={`${
          line.product.unit_type === "unitario"
            ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-3 py-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:gap-x-3 lg:px-4"
            : "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-3 py-2 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:gap-x-4 lg:px-4"
        } transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
          flashed !== null ? "flash" : ""
        }`}
      >
        <div
          className={
            line.product.unit_type === "pesable" ? "min-w-0" : "min-w-0 flex-1 basis-40"
          }
        >
          <p className="truncate font-medium">{line.product.name}</p>
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
            onChange={(event) => onWeightChange(event.target.value)}
            inputMode="decimal"
            className="col-span-2 row-start-2 w-36 lg:col-span-1 lg:col-start-2 lg:row-start-1"
            error={line.weightError ?? undefined}
          />
        ) : (
          <div className="flex items-center rounded-app border border-border bg-surface">
            <Button
              type="button"
              variant="ghost"
              size="md"
              iconOnly
              compactDesktop
              aria-label={`Restar uno a ${line.product.name}`}
              data-line-decrement={line.product.id}
              onClick={onDecrement}
              className="rounded-l-app rounded-r-none text-text-secondary hover:bg-surface-2 focus-visible:relative focus-visible:z-10"
            >
              <IconMinus className="size-3.5" />
            </Button>
            <span className="num flex h-11 w-11 items-center justify-center border-x border-border text-sm font-semibold md:h-9 md:w-9">
              {line.quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="md"
              iconOnly
              compactDesktop
              aria-label={`Sumar uno a ${line.product.name}`}
              onClick={onIncrement}
              className="rounded-l-none rounded-r-app text-text-secondary hover:bg-surface-2 focus-visible:relative focus-visible:z-10"
            >
              <IconPlus className="size-3.5" />
            </Button>
          </div>
        )}
        {line.product.unit_type !== "pesable" && (
          <p className="num w-24 justify-self-end text-right text-base font-semibold">
            {hasValidSubtotal
              ? formatMoney(effectiveLinePrice(calculated, line.actualPrice))
              : "—"}
          </p>
        )}
        {line.product.unit_type === "pesable" && (
          <div className="col-start-2 row-start-1 flex items-center justify-self-end gap-1 lg:col-start-3">
            <div className="relative">
              <Button
                ref={actualPriceToggleRef}
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`Editar el precio real de ${line.product.name}`}
                aria-expanded={actualPriceEditorOpen}
                aria-controls={actualPriceEditorId}
                title="Editar precio real"
                className="text-text-secondary hover:bg-surface-2"
                onClick={toggleActualPriceEditor}
              >
                <IconEdit className="size-4" />
              </Button>

              <AnimatePresence initial={false}>
                {actualPriceEditorOpen && (
                  <motion.div
                    id={actualPriceEditorId}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : MOTION.fast / 1000,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="absolute bottom-full -right-1 z-10 mb-2 w-60 rounded-app border border-border bg-surface-raised p-3 shadow-soft-lg"
                  >
                    <p className="mb-2 text-xs text-text-secondary">
                      Precio real cobrado.
                    </p>
                    <Input
                      ref={actualPriceInputRef}
                      aria-label="Precio real"
                      value={actualPriceDraft}
                      onChange={(event) => handleActualPriceChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          closeActualPriceEditor();
                        }
                      }}
                      inputMode="decimal"
                      className="w-full"
                      error={actualPriceError ?? undefined}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="num whitespace-nowrap text-base font-semibold">
              {hasValidSubtotal
                ? formatMoney(effectiveLinePrice(calculated, line.actualPrice))
                : "—"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={`Quitar ${line.product.name}`}
              title={`Quitar ${line.product.name}`}
              className="text-error hover:!bg-error/10 focus-visible:!text-error"
              onClick={onRemove}
            >
              <IconTrash className="size-4" />
            </Button>
          </div>
        )}
        {line.product.unit_type !== "pesable" && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={`Quitar ${line.product.name}`}
            title={`Quitar ${line.product.name}`}
            className="ml-auto text-error hover:!bg-error/10 focus-visible:!text-error"
            onClick={onRemove}
          >
            <IconTrash className="size-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
