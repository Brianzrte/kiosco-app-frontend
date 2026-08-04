"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { MOTION } from "@/lib/motion";
import { IconX } from "@/components/ui/icons";

export type ConfirmedSale = {
  id: string;
  total: string;
  saleNumber: number | null;
};

/**
 * Extracted verbatim from `PosView.tsx` — same JSX, same behavior (no
 * `aria-modal`, no focus trap: confirming a sale never blocks the start of
 * the next one; `role="status"`, not `"dialog"`, reflects that this
 * announces a result rather than asking for input). See design.md, "Affected
 * components".
 */
export function ConfirmedSalePanel({
  confirmedSale,
  shouldReduceMotion,
  onDismiss,
}: {
  confirmedSale: ConfirmedSale | null;
  shouldReduceMotion: boolean | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {confirmedSale && (
        <motion.div
          key="confirmed-sale-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4"
          onClick={onDismiss}
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
              onClick={onDismiss}
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
                {confirmedSale?.saleNumber !== null && (
                  <p className="num select-text text-5xl font-bold tracking-tight text-text-primary">
                    #{confirmedSale?.saleNumber}
                  </p>
                )}
                <p className="num mt-1 text-xl font-semibold text-text-secondary">
                  {confirmedSale?.total}
                </p>
              </div>

              <div className="flex w-full flex-col gap-2">
                <Button variant="primary" onClick={onDismiss}>
                  Nueva venta
                </Button>
                <Link
                  href={`/sales/${confirmedSale?.id}`}
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
  );
}
