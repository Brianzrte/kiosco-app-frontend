## 0. Prerequisites and coordination

- [ ] 0.1 Confirm with whoever is implementing `pos-draft-recovery-and-stock-in-product` (or the working-tree state of `PosView.tsx` at implementation time) which order the two changes will land in, per `design.md` "Migration Plan"; no shared endpoint or contract change is needed, only manual sequencing of the diff.
- [ ] 0.2 Inspect the current backend summary queries and record the baseline that they aggregate confirmed sale totals and payment rows without returns; this establishes the regression case for task 0.3.
- [ ] 0.3 Backend prerequisite: implement and deploy the contract in `backend-request.md` — `POST /sales/{id}/returns` accepts refund-payment distribution and atomically persists the return, restores stock, mutates the sale total/payment amounts, and exposes `updated_at`; verify cash, card, transfer, split-payment, partial-return, and later-Admin-return cases against a real instance before frontend compatibility work.
- [ ] 0.4 Confirm the deployed backend attributes each mutated sale to its original `confirmed_at` business day in operational lists, summaries, cash calculations, and reports; inspect the persisted return `created_at` and sale `updated_at` for audit traceability.

## 1. `useLoad` polling option

Note: `useLoad` is a React hook (`useEffect`/`useState`); its interval and
refetch wiring cannot be unit-tested in this repo's Vitest setup
(`environment: "node"`, no DOM, no `@testing-library/react` or equivalent
hooks-testing library installed — see `ai/context/testing.md`). Only logic
extractable as a plain function is automatable; the hook's own runtime
behavior is verified by inspection and by manual verification once wired
into a real screen.

- [ ] 1.1 Extract the visibility check as a small pure helper (e.g. `shouldPoll(visibilityState: DocumentVisibilityState | undefined): boolean`, returning whether a tick should fire) in `src/lib/useLoad.ts` or a colocated file — automated test: `src/lib/useLoad.test.ts` (new, plain function, no hook rendering) covering `"visible"`, `"hidden"`, and `undefined` (non-browser/node/test contexts).
- [ ] 1.2 Add an optional `{ pollMs }` parameter to `useLoad` that, while the calling component is mounted, re-invokes `fetcher` every `pollMs` (via `setInterval` inside the existing effect or a second effect) in addition to the existing effect-on-`fetcher`-change trigger, gated by the helper from 1.1 — inspection: confirm the interval is cleared on unmount and on `fetcher` change, and that no interval exists when `pollMs` is omitted (current call sites keep today's behavior exactly).
- [ ] 1.3 Ensure a poll-triggered fetch that rejects does not call the existing `setError` path and does not clear `data`; only the initial mount fetch (and an explicit `reload()`) may set `error` — inspection: confirm the poll branch's `.catch` does not call `setError`/`setData(null)`, only logs or is ignored.
- [ ] 1.4 Confirm the existing `cancelled` guard still discards a stale response correctly when `fetcher` changes (e.g. a filter change) while a poll tick is in flight — inspection: confirm the poll-triggered fetch reuses the same `cancelled` closure/effect-scoped flag as the mount fetch, with no separate untracked promise.
- [ ] 1.5 Confirm `useLoad`'s existing return shape (`{ data, error, reload }`) and its non-polling call sites (any `useLoad(fetcher)` without `pollMs`) are unaffected — inspection: no call site passing only `fetcher` changes behavior.
- [ ] 1.6 Manual verification: with `pollMs` wired into a real screen (see sections 2–4), confirm in the browser Network tab that the request repeats roughly every `pollMs` while the tab is visible, and stops while the tab is hidden.

## 2. `SalesView` — `DailySummaryCards` and `CashierTodaySummaryCards`

- [ ] 2.1 Pass a `pollMs` (30000) to the `useLoad` call backing `DailySummaryCards` (`GET /reports/sales/summary?from=hoy&to=hoy`) — manual verification: with the admin sales screen open, confirm the network tab shows a repeat request roughly every 30s while the tab is visible.
- [ ] 2.2 Pass the same `pollMs` to the `useLoad` call backing `CashierTodaySummaryCards` (`GET /sales/today-summary`) — same manual verification, cashier role.
- [ ] 2.3 Manual verification: register a sale or, after task 0.3 is deployed, a return from a second session/device while `/sales` is open in a first session; confirm the cards update within one interval without reloading, per `specs/ui-sales/spec.md` and `specs/ui-cash-closing/spec.md` new scenarios.
- [ ] 2.4 Manual verification: simulate a background refresh failure (e.g. temporarily block the request) while cards already show data; confirm the cards keep the last good figures and no `ErrorState` appears, only the initial-load error path still works when the first request itself fails.

## 3. `InventoryView` — stock list and low-stock ids

- [ ] 3.1 Pass `pollMs` (30000) to the `useLoad` call backing the main stock `fetcher` (`GET /inventory/stock?...`), preserving its existing `term`/`categoryId`/`lowStockOnly`/`page`/`pageSize` dependencies — automated test if any pure "should this request re-run" logic is extracted; otherwise inspection that the `fetcher` passed to `useLoad` is unchanged and only `pollMs` is added.
- [ ] 3.2 Pass the same `pollMs` to `lowStockIdsFetcher`'s `useLoad` call.
- [ ] 3.3 Confirm a periodic refresh tick does not close or otherwise disturb an open "Gestionar stock" dialog for a product — manual verification: open the dialog, wait past one interval, confirm the dialog and its in-progress input are untouched while the background list still updates.
- [ ] 3.4 Manual verification: register a return (or another stock movement) from a second session/device while `InventoryView` is open; confirm the affected row's quantity and, if applicable, its low-stock marking update within one interval without navigating away, per `specs/ui-inventory/spec.md` new scenarios.
- [ ] 3.5 Manual verification: background refresh failure keeps the previously loaded rows on screen with no error state, matching the initial-load error path staying intact for a first-load failure.

## 4. `SalesReportView`

- [ ] 4.1 Pass `pollMs` (30000) to the `useLoad` call backing `SalesReportContent`'s combined `fetcher` (daily-breakdown + range summary via `Promise.all`), preserving its existing `from`/`to`/`page`/`pageSize` dependencies.
- [ ] 4.2 Manual verification: with the sales report open on a specific range and page, confirm a periodic refresh re-fetches that same range/page (no reset to the default range or first page) and that a sale/return registered elsewhere from another device is reflected within one interval, per `specs/ui-reports-detail/spec.md` new scenarios.
- [ ] 4.3 Manual verification: background refresh failure keeps the previously loaded rows and summary on screen with no error state.

## 5. `PosView` — `stockByProduct` periodic refresh

- [ ] 5.1 Add a timer (interval `pollMs`, default 30000) inside `PosView` that, on each tick, re-requests `GET /inventory/stock/{product_id}` for every `productId` currently a key in `stockByProduct.current` and updates the cached value in place — coordinate this edit's placement/timing with task 0.1.
- [ ] 5.2 Guard the timer with the same visibility check as task 1.4 (`document.visibilityState === "visible"`) so it doesn't fire while the tab is hidden.
- [ ] 5.3 Confirm the refresh never proactively fetches a `productId` not already present as a key in `stockByProduct` — inspection: the tick's request set is derived from existing cache keys only, with no new eager fetch added.
- [ ] 5.4 Confirm the refresh never mutates the cart itself (no line removed, reordered, or blocked as a side effect of the tick) — inspection/manual: add a product to the cart, wait past one interval, confirm the cart line is untouched.
- [ ] 5.5 Confirm a failed refresh request for a given product leaves its previously cached value untouched and does not surface an error — manual verification: simulate a failure for one product's refresh request, confirm no visible error and the cached number is unchanged until the next successful tick.
- [ ] 5.6 Manual verification: with a product already scanned earlier in the session and its cached stock exhausted or low, register a return for that product from a second device; confirm that within one interval a subsequent add/quantity-increase attempt is validated against the restored quantity, without reloading — this is the primary scenario from the Requirement Context.
- [ ] 5.7 After task 0.3 is deployed, extend `ReturnForm` to collect refund payment method/amount distribution that exactly equals the selected merchandise value, preserving the existing reason and item validation — automated tests for any extracted payload/amount helper; manual verification for cash, card, transfer, and split refunds.
- [ ] 5.8 After task 0.3 is deployed, update `SaleDetail` and `src/lib/returns.ts` so the displayed sale total and payment amounts use the backend net values directly and return history remains audit-only; do not subtract returns locally a second time — inspection and manual verification after a partial return.
- [ ] 5.9 Pass `pollMs` (30000) to `SaleDetail`'s existing sale and return-history `useLoad` calls, keeping its current loading/error states and local net calculation until task 5.8 — inspection plus manual verification that a return registered from a second session appears without navigation and a background failure preserves the last good detail/history.

## 6. Cross-cutting checks

- [ ] 6.1 Inspection: confirm no new runtime dependency was added anywhere in this change (`package.json` untouched).
- [ ] 6.2 Inspection: confirm no `aria-live="polite"` or similar announcement region was added around any of the five refreshed surfaces, per `design.md` Accessibility.
- [ ] 6.3 Inspection: confirm no visible "actualizando…"/"last updated" indicator or new copy was added, per `design.md` Decision 5.
- [ ] 6.4 `npm run lint`.
- [ ] 6.5 `npm test` (covers `src/lib/useLoad.test.ts` and any other new/updated `*.test.ts`).
- [ ] 6.6 `npm run build` (touches `PosView.tsx`, `SalesView.tsx`, `InventoryView.tsx`, `SalesReportView.tsx`, and `useLoad.ts`, all under strict TypeScript).
- [ ] 6.7 Manual verification on a deployed backend: register a return from a second session while the sales cards and sales report are open; confirm each refreshes to the net amount within one interval, and the sale detail, return history, net payment amounts, sale `updated_at`, and original-sale-day reports agree.

## 7. Sync and archive (do not execute without explicit user decision)

- [ ] 7.1 Once implemented and verified, run `openspec archive fix-frontend-live-refresh-after-returns` (or the project's equivalent sync step) only after explicit user confirmation — not part of this change's automatic completion.
