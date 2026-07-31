import { ReactNode } from "react";

/**
 * Shared admin-screen header (visual-redesign, add-visual-redesign-tokens):
 * title + optional description + right-aligned primary action(s). Replaces
 * the ad-hoc `<h1 className="text-xl font-semibold">` + inline flex row
 * repeated across ProductsView, InventoryView, CategoriesView, UsersView,
 * ReceivingListView, ReportsView and the report detail views — same markup,
 * copy-pasted with small drifts (some screens had no wrapping row, no gap).
 * One primitive means one place to fix hierarchy or spacing going forward.
 *
 * Not used on PosView: the POS screen has no page title by design (the
 * scan field is the first thing a cashier sees, per pos-patterns.md).
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  titleAdornment,
  titleClassName,
  actions,
}: {
  title: string;
  description?: string;
  /** Small label above the title (e.g. a report's parent section). */
  eyebrow?: string;
  /** Small element next to the title, e.g. a status Badge (ux-ui fix-frontend-audit-2026-07). */
  titleAdornment?: ReactNode;
  /** Extra classes appended to the h1, e.g. `num` for a numeric title (sale number). */
  titleClassName?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1
            className={`text-2xl font-semibold tracking-tight text-text-primary${titleClassName ? ` ${titleClassName}` : ""}`}
          >
            {title}
          </h1>
          {titleAdornment}
        </div>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 md:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
