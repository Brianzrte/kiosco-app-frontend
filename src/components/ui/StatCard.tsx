import { ReactNode } from "react";

type Tone =
  | "neutral"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "payment-cash"
  | "payment-card"
  | "payment-transfer"
  | "summary-sales"
  | "summary-total";

const tileTones: Record<Tone, string> = {
  neutral: "bg-primary-light text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
  info: "bg-info/15 text-info",
  "payment-cash": "bg-payment-cash text-text-primary",
  "payment-card": "bg-payment-card text-text-primary",
  "payment-transfer": "bg-payment-transfer text-text-primary",
  "summary-sales": "bg-pastel-pink text-text-primary",
  "summary-total": "bg-pastel-yellow text-text-primary",
};

const borderTones: Record<Tone, string> = {
  neutral: "border-border",
  success: "border-border",
  warning: "border-border",
  error: "border-border",
  info: "border-border",
  "payment-cash": "border-payment-cash",
  "payment-card": "border-payment-card",
  "payment-transfer": "border-payment-transfer",
  "summary-sales": "border-pastel-pink",
  "summary-total": "border-pastel-yellow",
};

type Size = "default" | "compact";

// "default" (text-3xl value) is the dashboard's original size — kept as the
// prop default so no existing caller changes behavior silently.
// "compact" (mobile-pass follow-up, add-visual-redesign-tokens): a 3-5 tile
// row of these at md/xl column counts (SalesView's SummaryCards) or a plain
// 2-up row (ReportsView's SalesSummarySection) was wide enough for a money
// value at text-3xl (30px) to wrap inside a ~190-230px card and break the
// row's alignment. "compact" steps the value down further still on the
// narrowest phones (~110px tile, ~80px content after padding — a money
// value like "$1.234.567,89" at text-lg wraps or crowds the tile edge),
// text-lg from sm (384px) and text-xl from md — one step below the
// PageHeader h1 — plus tighter padding at the base so a row of these takes
// less vertical space above a table on mobile.
const valueSizes: Record<Size, string> = {
  default: "mt-3 text-3xl",
  compact: "mt-1.5 text-base sm:mt-2 sm:text-lg md:text-xl",
};

const paddings: Record<Size, string> = {
  default: "p-5",
  compact: "p-3 sm:p-3.5 md:p-4",
};

const iconSizes: Record<Size, string> = {
  default: "size-9",
  compact: "size-7 sm:size-8",
};

// Label + icon gap and label size, keyed the same as `Size`. On the
// narrowest tiles ("compact"), a text-sm label next to a size-8 icon
// crowds a ~80px content width and readily wraps to two lines, leaving the
// icon visually mis-centered against a two-line label. Stepping the label
// to text-xs and the gap to gap-2 below sm keeps most labels on one line
// without touching the "default" size used by wider dashboard tiles.
const headerGaps: Record<Size, string> = {
  default: "gap-3",
  compact: "gap-2 sm:gap-3",
};

const labelSizes: Record<Size, string> = {
  default: "text-sm",
  compact: "text-xs sm:text-sm",
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
      className={`rounded-app border ${borderTones[tone]} bg-surface shadow-soft ${paddings[size]} ${className}`}
    >
      <div className={`flex items-center ${headerGaps[size]}`}>
        {icon && (
          <span
            className={`flex shrink-0 items-center justify-center rounded-tight ${iconSizes[size]} ${tileTones[tone]}`}
          >
            {icon}
          </span>
        )}
        <p
          className={`font-medium leading-tight text-text-secondary ${labelSizes[size]}`}
        >
          {label}
        </p>
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
