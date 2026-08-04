## Why

Stock and sales figures shown on POS, Sales, Inventory, and the sales report
are fetched once and then frozen for as long as the screen stays open. If a
return is registered from another device — reinstating stock or generating a
movement — the person looking at an already-open screen never sees it unless
they navigate away and back. This is most damaging on the POS, where
`stockByProduct` caches a product's availability for the entire session: a
cashier can be blocked from adding more of a product whose stock was already
restored by someone else's return, with no way to see that short of
reloading the page. The same staleness affects the sales summary cards, the
inventory stock list, and the admin sales report.

## What Changes

- Add a small, screen-local polling mechanism (default 30s, while the screen
  is mounted) that re-requests the same data each screen already fetches
  today, with no new endpoint and no new dependency (explicitly not SWR,
  React Query, or any generic data-fetching layer).
- `useLoad` (`src/lib/useLoad.ts`) gains an opt-in periodic-refetch mode used
  by `SalesView` (`DailySummaryCards`, `CashierTodaySummaryCards`),
  `InventoryView`, and `SalesReportView`.
- `PosView`'s `stockByProduct` cache stops being "populate once per session
  per product": already-cached entries also get refreshed periodically, not
  just first-time lookups.
- A return keeps its immutable audit record but atomically changes the
  originating confirmed sale to its net total and payment amounts. That
  mutation is reported on the sale's original confirmation day.
- A failed background refetch never replaces good data already on screen
  with an error state; it is silently ignored and retried on the next tick.
  Only the initial load keeps today's `ErrorState` behavior.
- Background refetches never interrupt in-progress local state: an open
  edit dialog in `InventoryView`, or the POS cart, are left untouched — the
  refresh only updates the underlying data.
- Out of scope: any push mechanism (WebSocket/SSE) and cross-tab coordination
  (`BroadcastChannel`). The return-registration contract changes only as
  required to preserve net sales and payment figures.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `ui-pos`: `stockByProduct`/weighable-stock-check requirements gain
  periodic refresh instead of a session-long cache.
- `ui-sales`: the cashier's today-summary cards gain periodic refresh.
- `ui-cash-closing`: the admin daily summary cards gain periodic refresh.
- `ui-inventory`: the stock list (and its low-stock marking) gains periodic
  refresh.
- `ui-reports-detail`: the daily sales report (breakdown + range summary)
  gains periodic refresh.

## Impact

- `src/lib/useLoad.ts`: add an opt-in polling parameter.
- `src/components/pos/PosView.tsx`: `stockByProduct` cache invalidation.
- `src/components/sales/SalesView.tsx`: `DailySummaryCards`,
  `CashierTodaySummaryCards`.
- `src/components/inventory/InventoryView.tsx`: main stock `fetcher`,
  `lowStockIdsFetcher`.
- `src/components/reports/SalesReportView.tsx`: `SalesReportContent`
  `fetcher`.
- `src/components/sales/SaleDetail.tsx` and `src/lib/returns.ts`: trust the
  backend net sale total after rollout rather than subtracting returns again;
  meanwhile periodically refresh the existing sale and return-history reads.
- Backend change required: transactional mutation of the confirmed sale and
  its payment amounts on return registration. See `backend-request.md`.
- Sequencing note: `PosView.tsx` has uncommitted local changes in the
  working tree, and the open (backend-blocked) change
  `pos-draft-recovery-and-stock-in-product` also plans to touch
  `stockByProduct` in the same file (populating it from an embedded `stock`
  field on the product response, removing the separate
  `GET /inventory/stock/{id}` round-trip for a first scan). This change adds
  a refresh mechanism on top of the cache regardless of which of the two
  populates it initially; implementation should coordinate ordering to avoid
  overwriting the same region of the file twice. See `design.md`.
