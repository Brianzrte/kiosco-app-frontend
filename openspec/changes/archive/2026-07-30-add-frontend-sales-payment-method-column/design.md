## Context

`SalesTable` (`src/components/sales/SalesView.tsx`) renders the operational
sales list for both Admin and Cashier, in two parallel DOM trees mounted at
the same time: a `<ul>` of cards (`md:hidden`) and a `<Table>` (`hidden
md:block`). Neither shows the payment method today, even though
`OperationalSale.payments: SalePayment[]` already arrives in the same `GET
/sales` response the list already consumes (`src/lib/types.ts`). The list
also requests a fixed `PAGE_SIZE = 20`, which reliably overflows a standard
desktop viewport and forces page-level scroll — a problem Inventory already
solved with a measure-and-clamp mechanism
(`computeInventoryPageSize`, `src/lib/inventory.ts`,
`InventoryView.tsx:91-119`).

The status column already uses the target visual language: `SaleStatusBadge`
wraps the shared `Badge` primitive (`src/components/ui/Badge.tsx`) with a
`tone`. This change extends that same primitive with payment-specific tones
instead of introducing a new one-off component.

The normative requirement "Payment breakdown display"
(`openspec/specs/ui-sales/spec.md`) currently names "the sales list's
payment-method column" as covered by a plain-text-only rule, even though that
column was never implemented (confirmed against
`openspec/changes/archive/2026-07-29-add-frontend-sales-payments/tasks.md`,
section 7). This change modifies that requirement to carve out the list
column as the approved, narrow exception; the detail view and a return's
line keep the existing plain-text rule untouched.

## Goals / Non-Goals

**Goals:**
- Show the payment method(s) of every sale directly in the list row, using
  the existing payment-method color tokens, with text always present as a
  second channel.
- Replace the sales list's fixed page size with the same measure-and-clamp
  mechanism Inventory already uses, applied to both of `SalesTable`'s DOM
  trees.
- Keep the change frontend-only: no new endpoint, no new field, no new
  dependency.

**Non-Goals:**
- Changing `SaleDetail.tsx`, `ReturnHistory.tsx`, or `ReturnForm.tsx` — they
  keep the existing plain-text, no-color treatment.
- Adding the payment amount next to the pill in the list (unlike the detail
  view, which shows the amount when there are 2+ payments).
- Generalizing dynamic pagination to any other screen besides Sales.
- Extracting `/sales` query-building into a new `lib/sales.ts` beyond what
  this change's own helpers need — the existing inline query construction in
  `SalesView.tsx` is out of scope.
- Any list-virtualization library — the mechanism stays "measure the
  rendered list and adjust `limit`", same as Inventory.

## Decisions

### 1. Modify "Payment breakdown display" instead of adding a parallel requirement
Approved by the user: the requirement is **modified**, not replaced or
duplicated. Its plain-text-only rule stops naming "the sales list's
payment-method column" as covered, while every other clause (single vs.
split display, method labels, no `Mixto` collapse, no deprecated field,
`SummaryCards`' narrow existing exception) is preserved verbatim. This keeps
one authoritative requirement for "how an individual sale's payment is
shown" instead of splitting it across two requirements that could drift.

### 2. Pill style: full solid fill + label, not `SaleStatusBadge`'s literal opacity
The user's decision text says "fondo de color pleno" (full/solid color
fill) + label inside, citing `SaleStatusBadge`/"Confirmada" as the reference
pattern. Checking `Badge.tsx`, the `success`/`warning` tones `SaleStatusBadge`
actually uses render at 15% opacity (`bg-success/15 text-success`), not a
full fill — so a literal copy of those two tones would contradict "fondo de
color pleno". The three payment-method tokens already have a full-fill,
non-tinted precedent in this same codebase: `PosView.tsx`'s payment-method
selector uses `bg-payment-cash`/`bg-payment-card`/`bg-payment-transfer` at
full opacity with `text-text-primary`, matching the codebase's existing
pastel tones (`bg-pastel-green text-text-primary`, etc.), which are also
full fill. Decision: the new tones use full opacity, `text-text-primary`,
following the pastel/`PosView` pattern already established for these exact
tokens — not the `/15` tint. This satisfies "fondo de color pleno" literally
and avoids introducing a fourth distinct opacity convention into `Badge`.
Alternative considered: reuse `/15` tint for consistency with
`SaleStatusBadge` — discarded because it contradicts the explicit "pleno"
wording and departs from how these three tokens are already used elsewhere
in the app.

### 3. New `Tone`s live in `Badge.tsx`, not a dedicated component
Three new `Tone` values are added directly to the existing `tones` map in
`src/components/ui/Badge.tsx`: `"payment-cash"`, `"payment-card"`,
`"payment-transfer"`, mapping to `bg-payment-cash text-text-primary` (and
the card/transfer equivalents). This follows the same pattern already used
for `pastel-*` and `success`/`warning`/etc. — a `Tone` is the established
extension point for a new colored badge variant, and `SalesTable` already
imports `Badge` directly (via `SaleStatusBadge`). A dedicated
`PaymentMethodBadge` component was considered and discarded: it would only
wrap `Badge` with a fixed `tone` lookup and add a file for no behavioral
gain, mirroring how `SaleStatusBadge` itself is just a thin function, not a
new primitive.

A small pure mapping function, `paymentMethodTone(method): Tone`, lives in
`src/lib/sales.ts` (new file, see decision 5) next to the existing
`paymentMethodLabels` dictionary that already lives in `SalesView.tsx`. Only
the tone mapping moves to `lib/`, since it's the one piece worth a
colocated unit test asserting each of the three known methods maps to its
matching tone (`lib/sales.test.ts`). `paymentMethodLabels` itself stays
where it already is; this change does not move it.

### 4. Payment cell logic: direct render, no reordering, dash on empty
No new abstraction is introduced for "how many pills and in what order":
the cell renders `sale.payments` directly, in the order the array arrives,
with no sort and no cap enforced client-side (the backend/`paymentComposition.ts`
already caps a split at two methods; the frontend does not re-validate that
limit). When `sale.payments.length === 0`, the cell renders `"—"`, matching
the existing empty-number-cell convention. This mirrors `SaleDetail.tsx`'s
existing iteration order exactly, so the list and the detail view never
disagree about which method came "first" in a split.

### 5. Dynamic page size: generalize the pure clamp function, keep two named wrappers
`computeInventoryPageSize`'s clamp arithmetic (`src/lib/inventory.ts`) is
generic already — it only takes `viewportHeight`/`listTop`/`rowHeight`/
`reservedBelow` and a fixed `[5, 15]` clamp. This change extracts that
arithmetic into a shared, parameterized `computePageSize(opts: {
viewportHeight, listTop, rowHeight, reservedBelow, min, max, fallback })` in
the existing `src/lib/pagination.ts` (which already hosts the shared
`computeTotalPages`). `computeInventoryPageSize` becomes a thin wrapper over
`computePageSize` with Inventory's existing constants
(`INVENTORY_MIN_PAGE_SIZE`/`INVENTORY_MAX_PAGE_SIZE` unchanged, same
exported names, same behavior, same existing tests untouched), so Inventory
callers and its current test suite keep working without modification. A new
`computeSalesPageSize` wrapper (and `SALES_DEFAULT_PAGE_SIZE`/
`SALES_MIN_PAGE_SIZE`/`SALES_MAX_PAGE_SIZE` constants) is added to the new
`src/lib/sales.ts`, reusing the same `[5, 15]` clamp as Inventory. Rationale
for reusing `[5, 15]` rather than a Sales-specific range: the Requirement
Context leaves this non-blocking, and there is no evidence yet that a sales
row (with up to two pills instead of Inventory's single status pill) is
tall enough to change the useful floor/ceiling — the mobile card, not the
desktop row, is the taller unit either way, and both already fit comfortably
within 5–15 rows on the viewports this app targets (kiosk desktop + tablet).
This can be revisited with real measurements once implemented, without a
contract or requirement change.

Alternative considered: duplicate the whole clamp function verbatim inside
`lib/sales.ts` instead of extracting a shared `computePageSize`. Discarded
because it would let the two clamp implementations drift silently (e.g. a
future fix to the "rowHeight <= 0" fallback in one copy but not the other);
extracting the pure arithmetic once and keeping two named, tested wrappers
gets the same call-site ergonomics without duplicating logic.

### 6. Measuring two DOM trees instead of one
Unlike `InventoryView`'s single `<ul>`, `SalesTable` mounts both the mobile
`<ul>` (`md:hidden`) and the desktop `<Table>` (`hidden md:block`)
simultaneously; only one is visible at a time via `display: none`. This
change uses **two refs** (one per tree) and, on `recompute()`, measures both
and uses whichever one currently reports `rect.height > 0` (the hidden tree
reports `0` because `display: none` collapses its box, which is the same
signal an equivalent `matchMedia("(min-width: 768px)")` check would encode,
without duplicating Tailwind's `md` breakpoint value into JavaScript).
`recompute()` re-runs on the existing `resize` listener, so a resize that
crosses the `md` breakpoint mid-session re-measures whichever tree just
became visible, not the stale one. This is the one part of this change not
directly requested by the user — flagged as a documented risk below, not a
silent assumption.

### 7. No new capability, no `backend-request.md`
`GET /sales` already returns `payments` on every `OperationalSale`
(`src/lib/types.ts:44-53`); confirmed directly against the type in this
design pass, not only carried over from the Requirement Context. No field,
endpoint, role, or status changes. Only `ui-sales`'s existing "Payment
breakdown display" requirement is modified; `Badge.tsx`'s tone addition is
an implementation detail of `ui-foundation`'s already-generic "Shared UI
kit" requirement, which does not enumerate specific tones today, so it is
not itself a spec-level behavior change and gets no delta.

## User flow

1. Admin or Cashier opens `/sales`. The list loads with a page size computed
   from the currently available viewport instead of a fixed 20.
2. Each row (desktop and mobile) shows, in addition to the existing columns,
   one pill (single payment), two pills side by side in array order (split
   payment), or a dash (no payment yet — draft).
3. Activating a row still opens `/sales/{id}`; the detail view is unchanged
   and keeps rendering payments in plain text.
4. Resizing the window (or rotating a tablet) recomputes the page size for
   whichever tree is now visible and returns the list to page 1.

## UI states

- **Loading:** unchanged, `ListSkeleton`.
- **Empty:** unchanged, existing `EmptyState` messages; no new empty state
  is introduced for the payment cell itself.
- **Error:** unchanged, existing `ErrorState` with `onRetry`; the payment
  cell reads a field already present in the same response, so it introduces
  no new failure mode.
- **Success — one payment:** a single pill, method label only, no amount.
- **Success — two payments (split):** two pills, same order as
  `sale.payments`, each with its own label, no amount.
- **Success — no payment (draft):** `"—"`.

## Decisions (copy)

- Column header: **"Medio de pago"** — chosen over "Pago" for the same
  reason the existing `Th`s spell out "Cajero"/"Estado" rather than
  abbreviating: the header names the concrete data the cell shows (the
  payment *method*, not a generic "payment" that could be misread as an
  amount). Non-blocking per the Requirement Context; revisit only if UX
  review disagrees.
- Method labels: reuse the existing `paymentMethodLabels` dictionary
  (`SalesView.tsx`) — "Efectivo", "Tarjeta", "Transferencia". No new copy.
- No-payment cell: `"—"`, identical string and treatment to the existing
  Número column's empty state.

## Accessibility

- Color is never the only channel: every pill always renders its method
  label as text, exactly like `SaleStatusBadge` does for "Confirmada"/
  "Borrador".
- Text-over-fill contrast for the three payment tones reuses the same pair
  already shipped and presumed acceptable in `PosView.tsx`'s payment-method
  selector (`text-text-primary` over `bg-payment-cash/-card/-transfer`) — no
  new contrast pair is introduced.
- The pill is purely informational, not interactive: it adds no new
  tab stop and no new `aria-*` attribute; the row itself remains the single
  activation target, as today.
- No animation is introduced; `prefers-reduced-motion` is not implicated.

## Keyboard and focus behavior

Unchanged. The row remains the sole keyboard target
(`handleRowKeyDown`, Enter/Space opens the detail). The payment cell adds no
focusable element and does not change tab order.

## Responsive behavior

- **Desktop (`>= md`):** a new `<Th>`/`<Td>` pair is added to the existing
  `<Table>`; the table's ref is measured to compute page size when this
  tree is the visible one.
- **Mobile (`< md`):** the pill(s) are added to the existing card layout;
  the `<ul>`'s ref is measured to compute page size when this tree is the
  visible one.
- Both trees are measured on the same `resize`-driven `recompute()`; the
  page size only changes for the ref that is currently reporting a
  non-zero height, per Decision 6.

## API contract

Unchanged: `GET /sales?status=&limit=&page=&from=&to=&cashier_id=&sale_number=`
is still the only request. Only the `limit` value's source changes, from
the fixed `PAGE_SIZE = 20` to `computeSalesPageSize(...)`. No new query
parameter, no new response field, no new endpoint. `payments` is already
present and required (non-optional array) on `OperationalSale`; an empty
array is a valid, already-typed state (draft), not a nullability change.

## Error handling

Unchanged. The payment cell has no request or mutation of its own; any
fetch failure is already handled by the existing `ErrorState`/`onRetry` path
that wraps the whole list.

## Backend coordination

None. Confirmed directly against `src/lib/types.ts`
(`OperationalSale.payments: SalePayment[]`) that `GET /sales` already
returns everything this change needs; no `backend-request.md` is created.

## Risks / Trade-offs

- **[Risk]** Measuring two simultaneously-mounted DOM trees (Decision 6) is
  new territory this change introduces beyond what Inventory's single-tree
  pattern proves out; a resize that crosses the `md` breakpoint mid-fetch
  could race with an in-flight request using the previous tree's page size.
  → **Mitigation**: `recompute()` only calls `setPageSize`/`setPage(1)` when
  the computed size actually differs, exactly like `InventoryView` already
  does; a page-size change is safe to apply mid-flight because the next
  `useLoad` fetch simply uses the new `limit`, the same behavior Inventory
  already relies on today.
- **[Risk]** Reusing the same `[5, 15]` clamp as Inventory (Decision 5)
  without measuring an actual two-pill row first could under- or
  over-estimate how many rows fit once payment pills are added.
  → **Mitigation**: the clamp bounds are a constant, isolated in
  `lib/sales.ts`; adjusting them later is a one-line, fully-tested change
  that does not touch the spec or the contract.
- **[Risk]** Modifying a shipped requirement's wording ("Payment breakdown
  display") could be misread later as relaxing the rule generally.
  → **Mitigation**: the delta spec keeps every other clause of the
  requirement intact and states explicitly, in both the requirement text
  and a scenario, that the carve-out is narrow and named — mirroring how
  the same requirement already documents its one existing exception
  (`SummaryCards`).

## Migration Plan

No data migration. Deployment is a single frontend release:
`SalesTable` gains a column/cell and a dynamic page size; `Badge.tsx` gains
three tones; `lib/pagination.ts` gains a shared clamp function;
`lib/sales.ts` is a new file. No backend deploy ordering is required since
no contract changes.

## Rollback

Revert the frontend commit(s). No persisted state, no schema, and no
backend coordination is involved, so rollback is a plain code revert with
no follow-up cleanup.

## Open Questions

- Should the `[5, 15]` clamp for Sales diverge from Inventory's once a real
  two-pill row height is measured during implementation? Non-blocking;
  resolved with a constant change if needed, no spec impact either way.
- Should `paymentMethodLabels` also move from `SalesView.tsx` into
  `lib/sales.ts` alongside `paymentMethodTone`, for symmetry? Non-blocking;
  left where it already is unless implementation finds a concrete reason to
  move it.
