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
  actions,
}: {
  title: string;
  description?: string;
  /** Small label above the title (e.g. a report's parent section). */
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
