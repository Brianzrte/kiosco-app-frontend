## 1. Shared pure pagination helper

- [x] 1.1 In `src/lib/pagination.ts`, extract a generic `computePageSize(opts: { viewportHeight, listTop, rowHeight, reservedBelow, min, max, fallback })` from the clamp arithmetic currently inlined in `computeInventoryPageSize` (`src/lib/inventory.ts`). Evidence: automated test in `src/lib/pagination.test.ts` covering the fit calculation, the max clamp, the min clamp, and the `rowHeight <= 0` fallback (mirroring the existing cases in `src/lib/inventory.test.ts`).
- [x] 1.2 Re-implement `computeInventoryPageSize` as a thin wrapper over `computePageSize` using the existing `INVENTORY_MIN_PAGE_SIZE`/`INVENTORY_MAX_PAGE_SIZE`/`INVENTORY_DEFAULT_PAGE_SIZE` constants, keeping its exported name, signature, and behavior identical. Evidence: existing `src/lib/inventory.test.ts` suite passes unmodified (inspection + `npm test`).

## 2. New `lib/sales.ts` helpers

- [x] 2.1 Create `src/lib/sales.ts` with `SALES_MIN_PAGE_SIZE = 5`, `SALES_MAX_PAGE_SIZE = 15`, `SALES_DEFAULT_PAGE_SIZE = 15`, and `computeSalesPageSize(opts)` as a thin wrapper over the shared `computePageSize` from task 1.1. Evidence: automated test in `src/lib/sales.test.ts` covering the same fit/clamp/fallback cases as `computeInventoryPageSize`'s tests, using Sales' own constants.
- [x] 2.2 Add `paymentMethodTone(method: SalePayment["method"]): Tone` to `src/lib/sales.ts`, mapping `"CASH"`/`"CARD"`/`"TRANSFER"` to the three new `Tone` values from task 3.1. Evidence: automated test in `src/lib/sales.test.ts` asserting each of the three known methods maps to its expected tone.

## 3. `Badge` primitive: new payment tones

- [x] 3.1 In `src/components/ui/Badge.tsx`, add three `Tone` values — `"payment-cash"`, `"payment-card"`, `"payment-transfer"` — mapped to `bg-payment-cash text-text-primary`, `bg-payment-card text-text-primary`, `bg-payment-transfer text-text-primary` respectively (full opacity, matching the existing pastel-tone and `PosView` precedent, per design.md Decision 2). Evidence: inspection — the three tokens resolve to the same CSS custom properties already declared in `globals.css` (`--color-payment-cash/-card/-transfer`), and no `/15` opacity modifier is used for these three tones.
- [x] 3.2 Confirm (inspection) that no other current `Badge` consumer is affected: the `Tone` union only grows, no existing tone name or mapping changes.

## 4. `SalesTable` payment-method cell

- [x] 4.1 In `src/components/sales/SalesView.tsx`, add a "Medio de pago" column to the desktop `<Table>` (new `<Th>`/`<Td>` pair) rendering, for each row: a dash when `sale.payments.length === 0`; otherwise one `Badge` per entry in `sale.payments`, in array order, with `tone={paymentMethodTone(payment.method)}` and the existing `paymentMethodLabels[payment.method]` as its text.
- [x] 4.2 Add the equivalent payment-method cell to the mobile `<ul>` card layout, using the same dash/single/split rendering as 4.1, placed within the existing card structure.
- [x] 4.3 Inspection: confirm the cell never reorders `sale.payments` and never renders an amount, matching `SaleDetail.tsx`'s existing iteration order and the delta spec's "arrival order" scenario.

## 5. Dynamic page size wiring in `SalesView`

- [x] 5.1 Replace the fixed `PAGE_SIZE = 20` constant and its two call sites (`fetcher`'s `limit`, and every `computeTotalPages(data.total, PAGE_SIZE)` call) with a `pageSize` state initialized to `SALES_DEFAULT_PAGE_SIZE` and updated by `computeSalesPageSize`.
- [x] 5.2 Add two refs — one for the mobile `<ul>`, one for the desktop `<Table>`'s wrapping `<div>` — and a `resize`-driven `recompute()` effect (mirroring `InventoryView.tsx:96-119`) that measures whichever ref currently reports `getBoundingClientRect().height > 0`, calls `computeSalesPageSize`, and — only when the result differs from the current `pageSize` — updates `pageSize` and resets `page` to `1`.
- [x] 5.3 Confirm (inspection) the effect re-measures on every `resize` event, including one that crosses the `md` breakpoint mid-session, and that it never measures the currently-hidden tree as if it were visible.
- [x] 5.4 Define and use a `RESERVED_BELOW_LIST_PX` constant for Sales analogous to `InventoryView`'s, sized for the sales list's own pagination bar and page padding (inspect `layout.tsx`'s bottom padding, do not assume Inventory's exact value applies unchanged).

## 6. Spec-aligned copy and states

- [x] 6.1 Manual: verify the "Medio de pago" header text matches `design.md`'s decision and reads clearly at both breakpoints. Evidence: user manual verification on desktop and mobile (2026-07-30).
- [x] 6.2 Manual: verify a draft row (no payments) shows a dash in the new column at both breakpoints, matching the Número column's existing empty-cell treatment. Evidence: user manual verification on desktop and mobile (2026-07-30).
- [x] 6.3 Manual: verify a single-payment row shows exactly one badge with no amount, and a split-payment row shows exactly two badges in arrival order with no amount, at both breakpoints. Evidence: user manual verification on desktop and mobile (2026-07-30).

## 7. Accessibility and keyboard

- [x] 7.1 Manual: verify each payment badge always shows its method label as text, never color alone, across all three payment-method tones. Evidence: user manual verification (2026-07-30).
- [x] 7.2 Manual: verify text-over-fill contrast for the three new tones is legible (reusing the same pair already shipped in `PosView.tsx`'s payment-method selector). Evidence: user manual verification (2026-07-30).
- [x] 7.3 Manual: verify the payment cell adds no new tab stop and does not change existing keyboard row-activation behavior (Enter/Space still opens the detail from anywhere on the row). Evidence: user manual verification (2026-07-30).

## 8. Responsive verification

- [x] 8.1 Manual: on a standard desktop viewport, verify the list does not force page-level vertical scroll after the new column is added. Evidence: user manual verification on desktop (2026-07-30).
- [x] 8.2 Manual: resize the window across the `md` breakpoint while the list is mounted and verify the page size recomputes for the layout that becomes visible, and the list returns to page 1. Evidence: user manual verification (2026-07-30).
- [x] 8.3 Manual: verify behavior on a narrow/short viewport, confirming the `[5, 15]` clamp still holds (no fewer than 5 rows requested, no more than 15). Evidence: user manual verification (2026-07-30).

## 9. Tests, lint, build

- [x] 9.1 Run `npm test` and confirm `src/lib/pagination.test.ts`, `src/lib/sales.test.ts`, and the untouched `src/lib/inventory.test.ts` all pass.
- [x] 9.2 Run `npm run lint`.
- [x] 9.3 Run `npm run build` (this change touches `SalesView.tsx` and shared `lib`/UI-kit types).

## 10. Spec sync and archive (do not execute — user decision required)

- [ ] 10.1 Once implemented and verified, run OpenSpec's sync/validate flow against `openspec/specs/ui-sales/spec.md` — only on explicit user request.
- [ ] 10.2 Archive this change only on explicit user request, after sync.
