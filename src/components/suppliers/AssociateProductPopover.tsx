"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { IconCheckCircle, IconPlus } from "@/components/ui/icons";
import { api, ApiError } from "@/lib/api";
import { MOTION } from "@/lib/motion";
import {
  filterIncompleteDataSuggestions,
  splitReplenishmentSuggestions,
} from "@/lib/purchasing";
import { ProductSupplier, ReplenishmentSuggestionsList } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

type RowState = "pending" | "done" | "error";

export function AssociateProductPopover({
  supplierId,
  onAssociated,
}: {
  supplierId: string;
  onAssociated: () => void;
}) {
  const toast = useToast();
  const shouldReduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const popoverId = useId();
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const fetcher = useCallback(
    () => api<ReplenishmentSuggestionsList>("/purchase-orders/suggestions"),
    [],
  );
  const { data: suggestions, error, reload } = useLoad(fetcher);

  function toggle() {
    setOpen((current) => {
      if (!current)
        requestAnimationFrame(() => searchInputRef.current?.focus());
      return !current;
    });
  }

  function close() {
    setOpen(false);
    setSearch("");
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const { incompleteData } = suggestions
    ? splitReplenishmentSuggestions(suggestions.suggestions)
    : { incompleteData: [] };
  const visibleData = search.trim()
    ? filterIncompleteDataSuggestions(incompleteData, search)
    : incompleteData;

  async function associateProduct(productId: string, productName: string) {
    setRowState((current) => ({ ...current, [productId]: "pending" }));
    setRowError((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
    try {
      const { suppliers } = await api<{ suppliers: ProductSupplier[] }>(
        `/products/${productId}/suppliers`,
      );
      if (!suppliers.some((relation) => relation.supplier_id === supplierId)) {
        await api(`/products/${productId}/suppliers`, {
          method: "PUT",
          body: {
            suppliers: [
              ...suppliers.map((relation) => ({
                supplier_id: relation.supplier_id,
                preferred: relation.preferred,
                ...(relation.replenishment_frequency_days
                  ? {
                      replenishment_frequency_days:
                        relation.replenishment_frequency_days,
                    }
                  : {}),
              })),
              { supplier_id: supplierId, preferred: false },
            ],
          },
        });
      }
      if (!mountedRef.current) return;
      setRowState((current) => ({ ...current, [productId]: "done" }));
      toast("success", `${productName} asociado`);
      onAssociated();
    } catch (cause) {
      if (!mountedRef.current) return;
      setRowState((current) => ({ ...current, [productId]: "error" }));
      setRowError((current) => ({
        ...current,
        [productId]: (cause as ApiError).message || "No se pudo asociar",
      }));
    }
  }

  return (
    <div className="relative">
      <Button
        ref={triggerRef}
        type="button"
        variant="secondary"
        size="sm"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={toggle}
      >
        {open ? "Ocultar" : "Asociar producto"}
      </Button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={popoverId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : MOTION.fast / 1000,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute right-0 top-full z-20 mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-app border border-border bg-surface-raised p-4 shadow-soft-lg"
          >
            <h3 className="text-sm font-semibold text-text-primary">
              Productos sin proveedor preferido
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Tocá + para asociar un producto a este proveedor.
            </p>
            <Input
              ref={searchInputRef}
              autoFocus
              label="Buscar producto"
              placeholder="Escribí un nombre"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  close();
                }
              }}
              className="mt-3"
            />
            <div className="mt-3 max-h-72 overflow-y-auto rounded-app border border-border">
              {error ? (
                <div className="p-3">
                  <ErrorState error={error} onRetry={reload} />
                </div>
              ) : !suggestions ? (
                <div className="p-3">
                  <LoadingState label="Cargando productos…" />
                </div>
              ) : incompleteData.length === 0 ? (
                <p className="p-4 text-center text-sm text-text-secondary">
                  Todos los productos tienen proveedor preferido.
                </p>
              ) : visibleData.length === 0 ? (
                <p className="p-4 text-center text-sm text-text-secondary">
                  Ningún producto coincide con “{search.trim()}”.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {visibleData.map((suggestion) => {
                    const state = rowState[suggestion.product_id];
                    return (
                      <li
                        key={suggestion.product_id}
                        className="flex items-start gap-3 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {suggestion.product_name}
                          </p>
                          <p className="truncate text-xs text-text-secondary">
                            {suggestion.explanation}
                          </p>
                          {state === "error" && (
                            <p role="alert" className="mt-1 text-xs text-error">
                              {rowError[suggestion.product_id]}
                            </p>
                          )}
                        </div>
                        {state === "done" ? (
                          <span
                            className="flex size-9 shrink-0 items-center justify-center text-(--color-success-strong)"
                            aria-label={`${suggestion.product_name} asociado`}
                            title="Asociado"
                          >
                            <IconCheckCircle className="size-5" />
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant={state === "error" ? "danger-tint" : "secondary"}
                            size="sm"
                            iconOnly
                            className="shrink-0"
                            pending={state === "pending"}
                            pendingImmediate
                            aria-label={
                              state === "error"
                                ? `Reintentar asociar ${suggestion.product_name}`
                                : `Asociar ${suggestion.product_name}`
                            }
                            title={
                              state === "error" ? "Reintentar" : "Asociar"
                            }
                            onClick={() =>
                              associateProduct(
                                suggestion.product_id,
                                suggestion.product_name,
                              )
                            }
                          >
                            {state !== "pending" && (
                              <IconPlus className="size-4" />
                            )}
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
