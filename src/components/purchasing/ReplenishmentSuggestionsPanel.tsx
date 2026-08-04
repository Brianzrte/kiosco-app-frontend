"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconSearch } from "@/components/ui/icons";
import {
  computePageSize,
  computeTotalPages,
  pageWindow,
} from "@/lib/pagination";
import {
  filterIncompleteDataSuggestions,
  splitReplenishmentSuggestions,
} from "@/lib/purchasing";
import {
  ReplenishmentSuggestion,
  ReplenishmentSuggestionsList,
} from "@/lib/types";

export function ReplenishmentSuggestionsPanel({
  suggestions,
  onAddSuggestion,
}: {
  suggestions: ReplenishmentSuggestionsList | null | undefined;
  onAddSuggestion: (productId: string, quantity: number | undefined) => void;
}) {
  const [incompleteSearchOpen, setIncompleteSearchOpen] = useState(false);
  const [incompleteSearchTerm, setIncompleteSearchTerm] = useState("");
  const [incompletePage, setIncompletePage] = useState(1);
  const [incompletePageSize, setIncompletePageSize] = useState(15);
  const incompleteListRef = useRef<HTMLUListElement>(null);
  const incompleteSearchInputRef = useRef<HTMLInputElement>(null);
  const incompleteSearchButtonRef = useRef<HTMLButtonElement>(null);

  function openIncompleteSearch() {
    setIncompleteSearchOpen(true);
    requestAnimationFrame(() => incompleteSearchInputRef.current?.focus());
  }

  function closeIncompleteSearch() {
    setIncompleteSearchOpen(false);
    setIncompleteSearchTerm("");
  }

  function toggleIncompleteSearch() {
    if (incompleteSearchOpen) {
      closeIncompleteSearch();
      incompleteSearchButtonRef.current?.focus();
    } else {
      openIncompleteSearch();
    }
  }

  const { lowStock, incompleteData } = suggestions
    ? splitReplenishmentSuggestions(suggestions.suggestions)
    : { lowStock: [], incompleteData: [] };
  const visibleIncompleteData =
    incompleteSearchOpen && incompleteSearchTerm.trim()
      ? filterIncompleteDataSuggestions(incompleteData, incompleteSearchTerm)
      : incompleteData;

  useEffect(() => {
    if (visibleIncompleteData.length === 0) return;
    const recompute = () => {
      const rect = incompleteListRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = computePageSize({
        viewportHeight: window.innerHeight,
        listTop: rect.top,
        rowHeight:
          rect.height /
          Math.min(visibleIncompleteData.length, incompletePageSize),
        reservedBelow: 56,
        min: 5,
        max: 15,
        fallback: 15,
      });
      if (next === incompletePageSize) return;
      setIncompletePageSize(next);
      setIncompletePage(1);
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [incompletePageSize, visibleIncompleteData]);

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      <h2 className="text-sm font-medium text-text-secondary">
        Sugerencias de reposición
      </h2>
      {!suggestions ? (
        <p className="text-sm text-text-secondary">Cargando sugerencias…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-text-primary">
                Bajos de stock
              </h3>
              <Badge tone="success">
                {lowStock.length}{" "}
                {lowStock.length === 1 ? "producto" : "productos"}
              </Badge>
            </div>
            {lowStock.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No hay productos bajos de stock en este momento.
              </p>
            ) : (
              <ul className="max-h-96 divide-y divide-border overflow-y-auto rounded-app border border-border">
                {lowStock.map((suggestion) => (
                  <li
                    key={suggestion.product_id}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate font-medium text-text-primary"
                        title={suggestion.product_name}
                      >
                        {suggestion.product_name}
                      </p>
                      <p
                        className="truncate text-sm text-text-secondary"
                        title={suggestion.explanation}
                      >
                        {suggestion.explanation}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0"
                      onClick={() =>
                        onAddSuggestion(
                          suggestion.product_id,
                          suggestion.suggested_quantity,
                        )
                      }
                    >
                      Usar {suggestion.suggested_quantity}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-text-primary">
                Datos de planificación incompletos
              </h3>
              <Badge tone="neutral">Completar datos</Badge>
              <div className="ml-auto flex items-center gap-2">
                <div
                  className={`overflow-hidden transition-[width,opacity] duration-[var(--motion-base)] ease-[var(--ease-standard)] ${
                    incompleteSearchOpen
                      ? "w-40 opacity-100 sm:w-56"
                      : "w-0 opacity-0"
                  }`}
                >
                  <label htmlFor="incomplete-data-search" className="sr-only">
                    Buscar en datos de planificación incompletos
                  </label>
                  <input
                    id="incomplete-data-search"
                    ref={incompleteSearchInputRef}
                    value={incompleteSearchTerm}
                    onChange={(event) => {
                      setIncompleteSearchTerm(event.target.value);
                      setIncompletePage(1);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        closeIncompleteSearch();
                        incompleteSearchButtonRef.current?.focus();
                      }
                    }}
                    onBlur={() => {
                      if (!incompleteSearchTerm.trim()) {
                        setIncompleteSearchOpen(false);
                      }
                    }}
                    placeholder="Buscar producto…"
                    autoComplete="off"
                    tabIndex={incompleteSearchOpen ? 0 : -1}
                    className="w-full rounded-app border border-border bg-surface px-3 py-1.5 text-sm shadow-soft placeholder:text-text-disabled focus:border-primary"
                  />
                </div>
                <button
                  ref={incompleteSearchButtonRef}
                  type="button"
                  aria-label="Buscar en datos de planificación incompletos"
                  aria-expanded={incompleteSearchOpen}
                  onClick={toggleIncompleteSearch}
                  className="flex size-8 shrink-0 items-center justify-center rounded-app text-text-secondary transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover hover:text-text-primary"
                >
                  <IconSearch className="size-4" />
                </button>
              </div>
            </div>
            {(() => {
              if (incompleteData.length === 0) {
                return (
                  <p className="text-sm text-text-secondary">
                    No hay productos con datos de planificación incompletos.
                  </p>
                );
              }
              if (visibleIncompleteData.length === 0) {
                return (
                  <p className="text-sm text-text-secondary">
                    Ningún producto con datos incompletos coincide con “
                    {incompleteSearchTerm.trim()}”.
                  </p>
                );
              }
              const totalPages = computeTotalPages(
                visibleIncompleteData.length,
                incompletePageSize,
              );
              return (
                <>
                  <ul
                    ref={incompleteListRef}
                    className="divide-y divide-border rounded-app border border-border"
                  >
                    {pageWindow(
                      visibleIncompleteData,
                      incompletePage,
                      incompletePageSize,
                    ).map((suggestion) => (
                      <IncompleteDataSuggestionItem
                        key={suggestion.product_id}
                        suggestion={suggestion}
                        onConfirm={onAddSuggestion}
                      />
                    ))}
                  </ul>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <p className="text-xs text-text-secondary">
                        Página {incompletePage} de {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={incompletePage <= 1}
                          onClick={() =>
                            setIncompletePage((value) => Math.max(1, value - 1))
                          }
                        >
                          Anterior
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={incompletePage >= totalPages}
                          onClick={() =>
                            setIncompletePage((value) =>
                              Math.min(totalPages, value + 1),
                            )
                          }
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
      <p className="text-xs text-text-secondary">
        Completá proveedor y costo unitario antes de crear el pedido.
      </p>
    </div>
  );
}

function IncompleteDataSuggestionItem({
  suggestion,
  onConfirm,
}: {
  suggestion: ReplenishmentSuggestion;
  onConfirm: (productId: string, quantity: number) => void;
}) {
  const [checked, setChecked] = useState(false);
  const [quantity, setQuantity] = useState("1");

  function handleCheckedChange(next: boolean) {
    setChecked(next);
    if (!next) setQuantity("1");
  }

  function confirm() {
    const parsed = Number(quantity);
    if (!Number.isInteger(parsed) || parsed < 1) return;
    onConfirm(suggestion.product_id, parsed);
    setChecked(false);
    setQuantity("1");
  }

  return (
    <li className="flex flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-text-primary">
            {suggestion.product_name}
          </p>
          <p className="text-sm text-text-secondary">
            {suggestion.explanation}
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => handleCheckedChange(event.target.checked)}
            className="size-4 accent-primary"
          />
          Agregar al pedido
        </label>
      </div>
      {checked && (
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Cantidad"
            type="number"
            min="1"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="max-w-32"
          />
          <Button type="button" size="sm" variant="secondary" onClick={confirm}>
            Agregar
          </Button>
        </div>
      )}
    </li>
  );
}
