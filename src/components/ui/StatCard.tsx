import { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "error" | "info";

const tileTones: Record<Tone, string> = {
  neutral: "bg-primary-light text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
  info: "bg-info/15 text-info",
};

type Size = "default" | "compact";

// "default" (text-3xl value) is the dashboard's original size — kept as the
// prop default so no existing caller changes behavior silently.
// "compact" (mobile-pass follow-up, add-visual-redesign-tokens): a 3-5 tile
// row of these at md/xl column counts (SalesView's SummaryCards) or a plain
// 2-up row (ReportsView's SalesSummarySection) was wide enough for a money
// value at text-3xl (30px) to wrap inside a ~190-230px card and break the
// row's alignment. "compact" steps the value down to text-lg on the
// narrowest viewports (where 2-col packing is tightest) and text-2xl from
// sm (640px) up — matching the text-2xl already used, unwrapped, by
// SalesReportView's own stat tiles — plus tighter padding so a row of these
// takes less vertical space above a table on mobile.
const valueSizes: Record<Size, string> = {
  default: "mt-3 text-3xl",
  compact: "mt-2 text-lg sm:text-2xl",
};

const paddings: Record<Size, string> = {
  default: "p-5",
  compact: "p-3.5 sm:p-4",
};

const iconSizes: Record<Size, string> = {
  default: "size-9",
  compact: "size-8",
};

/**
 * Dashboard/report KPI tile (visual-redesign, add-visual-redesign-tokens).
 * Gives a headline number an icon tile and, optionally, a trend hint —
 * replacing the plain `<Card><p>label</p><p className="text-3xl">value</p>
 * </Card>` pattern in ReportsView's summary section, which read as a bare
 * fact with no visual entry point. Reused as-is by any screen that needs a
 * "big number + label" tile (dashboard, report headers).
 */
export function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
  size = "default",
  hint,
  className = "",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  /** "compact" for a row of several tiles above a table (Sales history, Reports) — see note above. "default" keeps the dashboard's original size. */
  size?: Size;
  /** Short trend/comparison line under the value (e.g. "+12% vs. mes anterior"). */
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-app border border-border bg-surface shadow-soft ${paddings[size]} ${className}`}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <span
            className={`flex shrink-0 items-center justify-center rounded-tight ${iconSizes[size]} ${tileTones[tone]}`}
          >
            {icon}
          </span>
        )}
        <p className="text-sm font-medium text-text-secondary">{label}</p>
      </div>
      <p
        className={`num font-semibold tracking-tight text-text-primary ${valueSizes[size]}`}
      >
        {value}
      </p>
      {hint && <div className="mt-1 text-sm text-text-secondary">{hint}</div>}
    </div>
  );
}
