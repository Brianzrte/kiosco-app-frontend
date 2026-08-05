"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { splitReplenishmentSuggestions } from "@/lib/purchasing";
import { ReplenishmentSuggestionsList } from "@/lib/types";

export function ReplenishmentSuggestionsPanel({
  suggestions,
  onAddSuggestion,
}: {
  suggestions: ReplenishmentSuggestionsList | null | undefined;
  onAddSuggestion: (productId: string, quantity: number | undefined) => void;
}) {
  const { lowStock } = suggestions
    ? splitReplenishmentSuggestions(suggestions.suggestions)
    : { lowStock: [] };

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      <h2 className="text-sm font-medium text-text-secondary">
        Sugerencias de reposición
      </h2>
      {!suggestions ? (
        <p className="text-sm text-text-secondary">Cargando sugerencias…</p>
      ) : (
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
      )}
    </div>
  );
}
