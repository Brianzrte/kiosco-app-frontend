"use client";

import { FormEvent, KeyboardEvent, RefObject } from "react";
import { formatMoney } from "@/lib/money";
import { Product } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { IconBarcode, IconSearch } from "@/components/ui/icons";

export type PosSearchResult = {
  product: Product;
  unavailable: boolean;
};

/**
 * Entry region: the scan-by-barcode field, the search-by-name field with its
 * results dropdown, and the single consolidated status message for both
 * (design.md, Decisión 10 y 16). No business logic lives here — `PosView`
 * resolves what the status message says and where the dropdown's results
 * come from; this component only orchestrates props into JSX.
 */
export function ScanOmnibox({
  barcode,
  onBarcodeChange,
  onScanSubmit,
  scanInputRef,
  searchTerm,
  onSearchTermChange,
  onSearchSubmit,
  onSearchKeyDown,
  searchInputRef,
  searchResults,
  activeResultIndex,
  onHoverResult,
  onPickResult,
  searchDismissed,
  entryStatusMessage,
  entryStatusIsError,
}: {
  barcode: string;
  onBarcodeChange: (value: string) => void;
  onScanSubmit: (event: FormEvent) => void;
  scanInputRef: RefObject<HTMLInputElement | null>;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent) => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchResults: PosSearchResult[];
  activeResultIndex: number;
  onHoverResult: (index: number) => void;
  onPickResult: (product: Product) => void;
  searchDismissed: boolean;
  entryStatusMessage: string | null;
  /** `false` for the lowest-priority "Buscando…"/"Ningún producto…" search
   * status (informational, not an error) — every other candidate in
   * `resolveEntryStatus`'s priority is an actual error. */
  entryStatusIsError: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <form onSubmit={onScanSubmit}>
          <label htmlFor="scan" className="mb-1.5 block text-sm font-medium">
            Escaneá o ingresá un código de barras
          </label>
          <div className="relative">
            <IconBarcode className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary/70" />
            <input
              id="scan"
              ref={scanInputRef}
              value={barcode}
              onChange={(e) => onBarcodeChange(e.target.value)}
              autoFocus
              autoComplete="off"
              placeholder="Código de barras"
              className="data h-12 w-full rounded-app border-2 border-border bg-surface pl-12 pr-4 text-base shadow-soft placeholder:font-sans placeholder:text-text-disabled hover:border-border-hover focus:border-primary"
            />
          </div>
        </form>

        <div className="relative">
          <form onSubmit={onSearchSubmit}>
            <label
              htmlFor="pos-search"
              className="mb-1.5 block text-sm font-medium"
            >
              ¿Sin código? Buscá el producto por nombre{" "}
              <span className="text-xs font-normal text-text-muted">(F3)</span>
            </label>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <input
                id="pos-search"
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                onKeyDown={onSearchKeyDown}
                autoComplete="off"
                placeholder="Nombre o SKU del producto"
                role="combobox"
                aria-expanded={!searchDismissed && searchResults.length > 0}
                aria-controls="pos-search-results"
                aria-activedescendant={
                  searchResults[activeResultIndex] &&
                  !searchResults[activeResultIndex].unavailable
                    ? `pos-search-result-${searchResults[activeResultIndex].product.id}`
                    : undefined
                }
                className="h-11 w-full rounded-app border border-border bg-surface pl-9 pr-4 shadow-soft placeholder:text-text-disabled hover:border-border-hover focus:border-primary"
              />
            </div>
          </form>

          {/* The result layer is anchored to its search field. Keeping it out
              of normal flow avoids moving the cart or the rest of the POS
              while a cashier searches (design.md, Decisión 16). */}
          {searchTerm.trim() &&
            !searchDismissed &&
            searchResults.length > 0 && (
              <ul
                id="pos-search-results"
                className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-app border border-border bg-surface shadow-soft"
              >
                {searchResults.map(({ product, unavailable }, index) => (
                  <li
                    key={product.id}
                    id={`pos-search-result-${product.id}`}
                    role="option"
                    aria-disabled={unavailable || undefined}
                    aria-selected={!unavailable && index === activeResultIndex}
                    className="border-b border-border last:border-b-0"
                  >
                    {unavailable ? (
                      <div className="flex items-center justify-between gap-4 px-4 py-3 text-text-secondary">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {product.name}
                          </span>
                          <span className="data block text-xs">
                            {product.sku}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <Badge tone="warning">Sin stock</Badge>
                          <span className="num shrink-0 whitespace-nowrap text-sm font-semibold">
                            {formatMoney(
                              product.unit_type === "pesable"
                                ? (product.price_per_kg ?? "0.00")
                                : product.price,
                            )}
                            {product.unit_type === "pesable" && "/kg"}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => onHoverResult(index)}
                        onClick={() => onPickResult(product)}
                        className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover focus-visible:bg-surface-hover ${
                          index === activeResultIndex ? "bg-surface-hover" : ""
                        }`}
                      >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {product.name}
                        </span>
                        <span className="data block text-xs text-text-secondary">
                          {product.sku}
                        </span>
                      </span>
                      <span className="num shrink-0 whitespace-nowrap text-sm font-semibold">
                        {formatMoney(
                          product.unit_type === "pesable"
                            ? (product.price_per_kg ?? "0.00")
                            : product.price,
                        )}
                        {product.unit_type === "pesable" && "/kg"}
                      </span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>

      <div className="min-h-12">
        {entryStatusMessage && (
          <div
            role={entryStatusIsError ? "alert" : "status"}
            className={
              entryStatusIsError
                ? "min-h-12 rounded-app border border-error/40 bg-error/10 px-4 py-3 text-sm font-medium text-error"
                : "min-h-12 px-1 text-sm text-text-secondary"
            }
          >
            {entryStatusMessage}
          </div>
        )}
      </div>
    </div>
  );
}
