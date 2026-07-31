## 0. Prerequisites

- [x] 0.1 Confirm no coordination with the backend is required for this change: manually verify `GET /api/v1/reports/sales/daily-breakdown`, `GET /suppliers`, and `GET /purchase-orders` behave as documented in `design.md` §7 (first two accept no pagination params; the third already does) against the router/handlers in `../backend` — inspection, not implementation. Evidence: router, reporting handler/use case, supplier handler/use case, and purchase-order handler/use case inspected.

## 1. P0 — Inventory movement history opens as a managed dialog

- [x] 1.1 Wrap `MovementHistorySection` in the same `Dialog` primitive `StockPanel`/"Ajustar" already uses in `InventoryView.tsx`, with its own `open`/`title`/`onClose`, instead of rendering it as a document-flow sibling — inspection of the resulting JSX structure.
- [ ] 1.2 Manual test: activate the history action from a product row and confirm the dialog opens with a visible overlay immediately, focus moves inside it, `Tab`/`Shift+Tab` stay trapped inside, and `Escape`, the backdrop, and the close control each close it and return focus to the row control that opened it.
- [ ] 1.3 Manual test: confirm the existing loading/empty/error states inside the movement history content are unchanged after the move into `Dialog`.

## 2. P1 — Table-to-cards mobile fallback (shared pattern)

- [x] 2.1 Confirm the exact mobile card shape used by `ProductsView.tsx` (`<ul className="md:hidden">` + `<div className="hidden md:block"><Table>`) as the model to replicate — inspection, no behavior change to `ProductsView.tsx` itself.
- [x] 2.2 Apply the same `md:hidden` card / `hidden md:block` table split to `PurchaseOrdersHistoryView.tsx`, showing at minimum supplier, status, order date and total per card.
- [x] 2.3 Apply the same split to the movement history table inside `InventoryView.tsx` (from task 1.1's dialog), showing at minimum product, quantity transition, type and timestamp per card.
- [x] 2.4 Apply the same split to `ProductsReportView.tsx`, showing at minimum product name, cost and price per card.
- [x] 2.5 Apply the same split to `PurchasesReportView.tsx`, showing at minimum date, total and received status per card, and correct its outdated "not built yet" copy/gating if any remains in the component (the report is live).
- [x] 2.6 Apply the same split to `CashClosingStatusReportView.tsx`, showing at minimum cashier, business day, reconciliation state and cash difference per card.
- [ ] 2.7 Manual test at 360×800 and 402×874: confirm none of the five migrated screens require horizontal scrolling to see their card content, and that state/status is never conveyed by colour alone in a card.

## 3. P1 — Header breakpoint

- [ ] 3.1 Manual measurement in a real browser (not calculation): render the header at 1024×768 and 1280×800 for the Admin role (widest item set: 8 `NAV_ITEMS` + logo + role badge + sign-out) and record whether each width produces horizontal overflow with full text labels visible.
- [ ] 3.2 Based on 3.1, change the label breakpoint in `Nav.tsx` (currently `hidden 2xl:inline` at the two locations identified, nav items and sign-out) to the narrowest of `lg`/`xl` that does not overflow; if neither fits, implement progressive icon-only collapse for lower-priority sections instead of keeping `2xl`.
- [ ] 3.3 Manual test: confirm no horizontal page or header overflow at 768×1024, 1024×768, 1280×800, 1366×768 and 1440×900 for every role, per the existing "Navigation shell has no horizontal overflow" requirement.
- [ ] 3.4 Manual test: confirm every icon-only item (at any width where it applies) still exposes an accessible name via assistive-technology inspection (accessibility tree / `aria-label`).

## 4. P1 — POS mobile action bar and stepper size

- [x] 4.1 Add a mobile (`< md`) fixed/sticky bottom bar in `PosView.tsx` holding the total and "Confirmar venta", replacing (not duplicating) their current in-flow position at that width, with the cart's bottom padding adjusted so no line is hidden behind the bar.
- [ ] 4.2 Manual test at 360×800, 390×844 (portrait) and 844×390 (short landscape) with at least one cart item: confirm the total and "Confirmar venta" are reachable without scrolling.
- [ ] 4.3 Manual test at ≥768px: confirm the two-column layout and the total/confirm position are unchanged from before this change.
- [x] 4.4 Change the cart's quantity increment/decrement controls (`PosView.tsx` ~655, 666) from the ad-hoc `size-9` classes to the touch-target convention `Button`'s `iconOnly` size already documents (44px mobile, smaller only from `md`), reusing that convention instead of a new ad-hoc size.
- [ ] 4.5 Manual test: measure the rendered stepper controls below `md` and confirm each is ≥44px on its shorter side; confirm `aria-label` and increment/decrement behavior are unchanged.

## 5. P2 — Shared collapsible filter/search primitive

- [x] 5.1 Extract the collapsible search pattern already implemented in `PurchaseOrderForm.tsx` (~325–372: `aria-expanded` trigger, width/opacity transition on motion tokens, `Escape`-to-collapse with focus return, collapse-on-blur-when-empty) into a shared primitive in `src/components/ui/`, generalized to also hold non-search filter controls (selects, date range, toggles) as children, with a trigger badge showing the active-filter count when collapsed.
- [x] 5.2 Automated test: if any part of the active-filter-count logic can be extracted as a pure function (e.g. counting non-default filter values), add a `*.test.ts` for it in `lib/`; otherwise note in the PR description that the logic is render-only and covered by manual testing. Evidence: active counts remain render-only per screen; no pure helper was introduced.
- [ ] 5.3 Manual test: keyboard-operate the primitive in isolation — `Enter`/`Space` expands, `aria-expanded` toggles, `Escape` collapses and returns focus to the trigger, and the active-filter count remains visible as text (not colour-only) while collapsed.

## 6. P2 — Apply collapsible filters per screen

- [x] 6.1 `/sales` (Historial de ventas, Admin view): keep sale-number search visible; move Estado, Cajero, Desde and Hasta into the shared collapsible group.
- [x] 6.2 `/products`: keep the name/SKU/barcode search visible; move category and active-state filters into the shared collapsible group.
- [x] 6.3 `/inventory`: keep search and "Stock bajo" visible; move the category filter into the shared collapsible group; separately, fix the layout bug where the search input and category select share a row on mobile — stack them vertically below `md` regardless of collapse state.
- [x] 6.4 `/purchasing/history`: move Proveedor, Estado, Desde and Hasta into the shared collapsible group.
- [x] 6.5 `/reports/sales`: keep period presets visible; move explicit Desde/Hasta into the shared collapsible group.
- [x] 6.6 `/reports/products`: move period and best/worst-selling sort filters into the shared collapsible group.
- [x] 6.7 `/reports/purchases`: move week/month/supplier filters into the shared collapsible group.
- [x] 6.8 `/reports/cash-closings`: move date-range and Cashier filters into the shared collapsible group.
- [ ] 6.9 Manual test per screen (360×800): confirm the visible controls listed in `design.md` §3 appear before any result, secondary filters start collapsed, applying a filter and then collapsing the group keeps it applied and shows its active-filter count, and the group is keyboard-operable end to end.

## 7. P2 — Summary cards carousel and de-duplication

- [x] 7.1 Change `SummaryCards`' mobile (`< md`) container to a horizontally scrollable, scroll-snapping row; confirm no change to its data, colours or accent requirement (`ui-sales`) from `md` up.
- [x] 7.2 Remove `SummaryTiles` from `SalesReportView.tsx` and render `<SummaryCards>` instead, adapting `summarizeDays()`'s output to the `SalesSummaryByPaymentMethod` shape `SummaryCards` already consumes — inspection to confirm no anonymous shape is introduced and no client-side aggregation beyond adding the backend's own per-day amounts occurs.
- [ ] 7.3 Manual test: compare the range summary shown by `SalesReportView` before and after this change for the same date range and confirm the five values match exactly.
- [ ] 7.4 Manual test at 360×800: confirm the summary cards scroll horizontally with snap on both `/sales` and `/reports/sales`, and that the layout is unchanged from `md` up on both screens.

## 8. P2 — Render pagination for large datasets

- [x] 8.1 Add pure page-window logic reuse: confirm `computeTotalPages` (`lib/pagination.ts`) is reusable as-is for client-side render pagination (not just backend-paginated lists); if a new pure helper is needed (e.g. slicing an in-memory array into a page window), add it with a colocated `*.test.ts`.
- [x] 8.2 `/reports/sales`: paginate the day-list render (25 days/page, "Página N de M", Anterior/Siguiente, matching `PurchasingHubView.tsx`'s visual pattern) over the already-fetched `daily-breakdown` response; the request itself is unchanged (still one call per range).
- [x] 8.3 `/suppliers`: replace the `max-h-[calc(100vh-18rem)] overflow-y-auto` container with the same page-window pattern over the already-fetched full supplier list; the request itself is unchanged (still one call, since the backend endpoint accepts no pagination params).
- [x] 8.4 `PurchaseOrderForm.tsx`'s "Datos de planificación incompletos" list: bound its render via pagination or an explicit "cargar más" action instead of mounting every interactive row (`checkbox` + "Agregar al pedido") from the `max-h-96 overflow-y-auto` list at once.
- [ ] 8.5 Manual test: confirm each of the three lists no longer mounts its full row count simultaneously (inspect rendered row count vs. total in dev tools) and that pagination/"load more" controls are keyboard-operable.

## 9. P2 — Purchasing hub reorder

- [x] 9.1 In `PurchasingHubView.tsx`, reorder the mobile (`< md`) layout so the `<aside aria-label="Acciones de compras">` action panel (including "Crear pedido") appears before the pending-order list; confirm the desktop four-fifths/one-fifth split is unchanged at `md` and up.
- [ ] 9.2 Manual test at 360×800 with a large pending-order dataset (or the seeded test data, ~509 orders): confirm "Crear pedido" is reachable without scrolling past the pending-order list.

## 10. P2 — Remove the cash-closing tool

- [x] 10.1 Remove the "Cierre de caja" button and `CashClosingTool` component from `SalesView.tsx`, with no relocation and no replacement control or screen.
- [ ] 10.2 Manual test: confirm `/sales` no longer offers any control leading to the removed tool, and that `CashierReconciliationIndicator`/`CashierShiftClosingModal` (the unrelated cashier shift-closing feature) are completely unaffected — still present for role `cashier`, still absent for other roles.

## 11. P1 — Notebook density audit for the complete non-POS flow

- [ ] 11.1 Build the browser audit matrix for every non-POS route: `/login`; shell and cashier shift closing; `/sales` and `/sales/[id]`; `/products`, `/products/new`, `/products/[id]`, `/categories`; `/inventory`; `/purchasing`, `/purchasing/history`, `/purchasing/new`, `/purchasing/[id]`, `/purchasing/suppliers`, `/suppliers`, `/receiving` and `/receiving/[id]`; `/reports`, `/reports/sales`, `/reports/products`, `/reports/purchases`, `/reports/cash-closings`, `/reports/inventory-valuation`; and `/users`, `/users/new`, `/users/[id]`. Evidence: one recorded result per route and viewport; POS is explicitly excluded because it is closed.
- [ ] 11.2 In `SaleDetail`, replace the duplicated cell/content vertical padding with an explicit compact table density governed by the shared UI kit, preserving semantic headers, numeric alignment, corrected-price explanation, long-name wrapping and all required item/payment data. Evidence: code inspection plus rendered row measurements at 1024×768 and 1366×768.
- [ ] 11.3 Audit and apply only scoped size/overflow fixes to login, authenticated shell, mobile navigation drawer and cashier shift-closing modal. Evidence: keyboard and visual pass at 360×800, 1024×768 and 1366×768, with no change to role or mutation behavior.
- [ ] 11.4 Audit and apply only scoped size/overflow fixes to sales list, sale detail and return history/form, excluding POS. Evidence: list/detail/return flow completes at 360×800, 1024×768 and 1366×768; primary actions remain reachable and no table or dialog produces accidental page overflow.
- [ ] 11.5 Audit and apply only scoped size/overflow fixes to products list/detail/create, categories and inventory, excluding the already-closed POS. Evidence: search/filter/form/stock-history flows at 360×800, 1024×768 and 1366×768; tables, dialogs and comboboxes preserve their required data and actions.
- [ ] 11.6 Audit and apply only scoped size/overflow fixes to purchasing hub/history/create/detail, suppliers and receiving redirects/detail. Evidence: create/history/receive/supplier flows at 360×800, 1024×768 and 1366×768; role-gated actions remain visible or absent as specified.
- [ ] 11.7 Audit and apply only scoped size/overflow fixes to reports hub, sales, products, purchases, cash-closings and inventory valuation. Evidence: filters, summaries, tables/cards, charts and pagination at 360×800, 1024×768 and 1366×768; no critical metric or action is clipped.
- [ ] 11.8 Audit and apply only scoped size/overflow fixes to users list/detail/create. Evidence: admin list and form flows at 360×800, 1024×768 and 1366×768; labels, validation and submit actions remain reachable.
- [ ] 11.9 Run the complete browser pass through Chrome DevTools MCP from a clean session, recording viewport, route, scroll dimensions, visible primary action, and any remaining finding. A route is not marked visually verified from static code inspection alone.

## 12. Verification

- [x] 11.1 `npm run lint` (passes with the pre-existing `PosView.tsx` exhaustive-deps warning.)
- [x] 11.2 `npm test` (124 tests passed.)
- [x] 11.3 `npm run build` (successful with network access for the existing Google Fonts.)
- [ ] 12.4 Manual regression pass across the touched non-POS screens and the new sale-detail density behavior at 360×800, 768×1024, 1024×768, 1280×800, and 1366×768, confirming no unintended change to layout at `md`/`lg`/`xl`/`2xl` outside the approved fixes. POS is excluded from this pass.
- [ ] 12.5 Backend-real check: re-confirm against a running local backend instance that `GET /api/v1/reports/sales/daily-breakdown`, `GET /suppliers`, and `GET /purchase-orders` still behave exactly as verified in task 0.1, since this change's pagination work assumes their current (non-)support for query-level pagination.
- [ ] 12.6 Sync specs and archive this change — **not executed here**; requires explicit user decision after implementation and review.
