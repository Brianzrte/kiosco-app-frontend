"use client";

import { RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fromCents, formatMoney } from "@/lib/money";
import {
  PaymentInput,
  SplitPaymentInput,
  SplitPaymentMethod,
} from "@/lib/paymentComposition";
import type { CartSummary } from "@/lib/cart";
import { MOTION } from "@/lib/motion";
import {
  IconCardPay,
  IconCash,
  IconSplit,
  IconTransfer,
} from "@/components/ui/icons";

const PAYMENT_LABELS: Record<SplitPaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

// Decorative category color per payment method (not a status/event color —
// see ai/skills/ux-ui-supervisor/references/color-system.md). Uses the
// dedicated --color-payment-* tokens (globals.css, "POS payment accents").
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

const PAYMENT_SHORTCUTS: Record<SplitPaymentMethod, string> = {
  CASH: "Alt+1",
  CARD: "Alt+2",
  TRANSFER: "Alt+3",
};

const PAYMENT_OPTIONS = [
  ["CASH", "Efectivo"],
  ["CARD", "Tarjeta"],
  ["TRANSFER", "Transferencia"],
] as const satisfies readonly (readonly [SplitPaymentMethod, string])[];

const PAYMENT_ICONS: Record<SplitPaymentMethod, typeof IconCash> = {
  CASH: IconCash,
  CARD: IconCardPay,
  TRANSFER: IconTransfer,
};

const panelTransition = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
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

/** "N líneas" always, plus units/kg only for the magnitudes present in the
 * cart (design.md, Decisión 9) — never summed together. */
function summaryText(summary: CartSummary): string {
  const parts = [
    `${summary.lineCount} línea${summary.lineCount === 1 ? "" : "s"}`,
  ];
  if (summary.hasUnitLines) {
    parts.push(
      `${summary.unitCount} unidad${summary.unitCount === 1 ? "" : "es"}`,
    );
  }
  if (summary.hasWeighableLines) {
    parts.push(`${summary.weightKg.toFixed(3)} kg`);
  }
  return parts.join(" · ");
}

export function CheckoutPanel({
  totalCents,
  totalFlash,
  summary,
  payment,
  onSelectPayment,
  splitPayments,
  onStartSplitPayment,
  onStopSplitPayment,
  onUpdateSplitAmount,
  splitAmountRef,
  cartEmpty,
  cashPayment,
  cashReceived,
  onCashReceivedChange,
  cashReceivedRef,
  cashChangeCents,
}: {
  totalCents: number;
  totalFlash: number;
  summary: CartSummary;
  payment: SplitPaymentMethod | null;
  onSelectPayment: (method: SplitPaymentMethod) => void;
  splitPayments: SplitPaymentInput[] | null;
  onStartSplitPayment: () => void;
  onStopSplitPayment: () => void;
  onUpdateSplitAmount: (amount: string) => void;
  splitAmountRef: RefObject<HTMLInputElement | null>;
  cartEmpty: boolean;
  cashPayment: PaymentInput | undefined;
  cashReceived: string;
  onCashReceivedChange: (value: string) => void;
  cashReceivedRef: RefObject<HTMLInputElement | null>;
  cashChangeCents: number | null;
}) {
  const shouldReduceMotion = useReducedMotion();
  const motionPanelTransition = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: MOTION.fast / 1000 },
      }
    : panelTransition;

  return (
    <>
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
        <p className="text-sm text-text-secondary">{summaryText(summary)}</p>
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
                  onChange={() => onSelectPayment(value)}
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
                <span className="text-[0.65rem] font-normal text-text-muted">
                  {PAYMENT_SHORTCUTS[value]}
                </span>
              </label>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {splitPayments ? (
            <motion.div
              key="split-panel"
              initial={motionPanelTransition.initial}
              animate={motionPanelTransition.animate}
              exit={motionPanelTransition.exit}
              transition={motionPanelTransition.transition}
              className="mt-3 flex flex-col gap-3 rounded-app border border-border bg-surface-2 p-3"
            >
              <Input
                ref={splitAmountRef}
                label={`${PAYMENT_LABELS[splitPayments[0].method]} (importe)`}
                value={splitPayments[0].amount}
                onChange={(event) => onUpdateSplitAmount(event.target.value)}
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
                onClick={onStopSplitPayment}
              >
                Usar un solo medio
              </Button>
            </motion.div>
          ) : payment !== "TRANSFER" ? (
            <motion.div
              key="split-button"
              initial={motionPanelTransition.initial}
              animate={motionPanelTransition.animate}
              exit={motionPanelTransition.exit}
              transition={motionPanelTransition.transition}
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3 gap-1.5"
                disabled={cartEmpty}
                onClick={onStartSplitPayment}
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
              <motion.div
                key="cash-change-panel"
                initial={motionPanelTransition.initial}
                animate={motionPanelTransition.animate}
                exit={motionPanelTransition.exit}
                transition={motionPanelTransition.transition}
                className="flex flex-col gap-2 rounded-app border border-border bg-surface-2 p-3"
              >
                <div className="[&_input]:num [&_input]:text-2xl [&_input]:font-bold">
                  <Input
                    ref={cashReceivedRef}
                    label="Efectivo entregado"
                    value={cashReceived}
                    onChange={(event) =>
                      onCashReceivedChange(event.target.value)
                    }
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </div>
                {cashChangeCents !== null && (
                  <p
                    className={`num text-2xl font-bold tracking-tight ${
                      cashChangeCents >= 0 ? "text-success" : "text-warning"
                    }`}
                  >
                    {cashChangeCents >= 0
                      ? `Vuelto ${formatMoney(fromCents(cashChangeCents))}`
                      : `Faltan ${formatMoney(fromCents(-cashChangeCents))}`}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </fieldset>
    </>
  );
}
