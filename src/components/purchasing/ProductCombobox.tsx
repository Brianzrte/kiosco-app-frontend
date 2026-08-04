"use client";

import { KeyboardEvent, useId, useMemo, useState } from "react";
import { Product } from "@/lib/types";

// Reuses the same accessible combobox pattern already implemented in the
// POS product search (PosView.tsx): role="combobox", aria-expanded,
// aria-controls, aria-activedescendant, options with role="option", client-
// side filtering with useMemo and keyboard navigation (design.md, decision
// 10). The initial displayed text is derived once from the item's current
// productId (set on mount only) because the only path that changes an
// existing row's productId afterwards is this same combobox calling
// onSelect, so no external re-sync is needed while the row stays mounted.
export function ProductCombobox({
  productId,
  products,
  onSelect,
  hideLabel = false,
}: {
  productId: string;
  products: Product[];
  onSelect: (productId: string) => void;
  /** Visually hides the "Producto" label (kept for screen readers via
   * `sr-only`) when the combobox sits under a table column header that
   * already says "Producto" (NewPurchaseOrder.dc.html mockup: one table
   * header row, no per-cell label). */
  hideLabel?: boolean;
}) {
  const listId = useId();
  const selectedProduct = products.find((product) => product.id === productId);
  const [text, setText] = useState(selectedProduct?.name ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    const term = text.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((product) => product.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [products, text]);

  function pick(product: Product) {
    setText(product.name);
    setOpen(false);
    onSelect(product.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[activeIndex] ?? results[0];
      if (target) pick(target);
    }
  }

  const showResults = open && text.trim().length > 0;

  return (
    <div className="relative">
      <label
        htmlFor={listId}
        className={
          hideLabel
            ? "sr-only"
            : "mb-1.5 block text-sm font-medium text-text-secondary"
        }
      >
        Producto
      </label>
      <input
        id={listId}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setActiveIndex(0);
          setOpen(true);
          if (event.target.value.trim() === "" && productId) onSelect("");
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (text.trim()) setOpen(true);
        }}
        role="combobox"
        aria-expanded={showResults}
        aria-controls={`${listId}-results`}
        aria-activedescendant={
          results[activeIndex]
            ? `${listId}-result-${results[activeIndex].id}`
            : undefined
        }
        autoComplete="off"
        placeholder="Buscá un producto…"
        className="w-full rounded-app border border-border bg-surface px-3 py-2 text-sm shadow-soft placeholder:text-text-disabled hover:border-border-hover focus:border-primary"
      />
      {showResults && (
        <ul
          id={`${listId}-results`}
          className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-app border border-border bg-surface shadow-soft"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-secondary">
              Ningún producto coincide con “{text.trim()}”.
            </li>
          ) : (
            results.map((product, index) => (
              <li
                key={product.id}
                id={`${listId}-result-${product.id}`}
                role="option"
                aria-selected={index === activeIndex}
                className="border-b border-border last:border-b-0"
              >
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(product)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover focus-visible:bg-surface-hover ${
                    index === activeIndex ? "bg-surface-hover" : ""
                  }`}
                >
                  <span className="min-w-0 truncate font-medium text-text-primary">
                    {product.name}
                  </span>
                  <span className="data shrink-0 text-xs text-text-secondary">
                    {product.sku}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
