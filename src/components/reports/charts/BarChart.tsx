"use client";

import { ReactNode } from "react";

export type BarItem = {
  id: string;
  label: string;
  value: number;
  badge?: ReactNode;
};

/**
 * Horizontal bars, single series (brand Primary — a categorical palette is
 * only for two-or-more simultaneous series). Value is labelled directly at
 * the bar's end, so no separate hover tooltip is needed; hover/focus only
 * lifts the bar to acknowledge the pointer, per the dataviz mark spec.
 */
export function BarChart({
  items,
  formatValue,
  ariaLabel,
}: {
  items: BarItem[];
  formatValue: (value: number) => string;
  ariaLabel: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="flex flex-col gap-4" role="img" aria-label={ariaLabel}>
      {items.map((item) => {
        const pct = item.value > 0 ? Math.max((item.value / max) * 100, 2) : 0;
        return (
          <div key={item.id} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium text-text-primary">
                {item.label}
              </span>
              {item.badge}
            </div>
            <div
              tabIndex={0}
              className="group flex items-center rounded-app focus-visible:outline-none"
            >
              <div className="flex-1">
                <div
                  className="h-6 rounded-r-app bg-primary transition-[filter] group-hover:brightness-110 group-focus-visible:brightness-110"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="num ml-3 w-24 shrink-0 text-right text-sm font-medium text-text-primary">
                {formatValue(item.value)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
