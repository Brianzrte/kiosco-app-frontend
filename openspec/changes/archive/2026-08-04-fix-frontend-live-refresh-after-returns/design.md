## Context

Four screens fetch their data once (`useLoad`'s effect runs on
`[fetcher, tick]`, and `tick` only advances on a manual `reload()`) or, in
POS's case, cache it in a `useRef` (`stockByProduct`) that is populated once
per `productId` and never invalidated. None of the four has any
time-based or focus-based refresh. The explicit trigger driving this change
is a return registered by another person on another device: nothing in the
current screen's own tab/window state (focus, visibility) will ever fire in
that case, which rules out `visibilitychange`/`focus` listeners as the sole
mechanism. There is no WebSocket/SSE or backend push today
(`ai/context/api-contract.md`, confirmed by `grep` across `src/` and the
backend router), and the approved scope explicitly excludes adding a
data-fetching library (SWR/React Query) or a generic invalidation layer.
Polling is therefore the only mechanism available within scope.

## Goals / Non-Goals

**Goals:**

- While any of the four screens is mounted, its relevant query/queries
  re-fetch automatically on a fixed interval, independent of user focus or
  navigation, so a change made elsewhere becomes visible without the user
  doing anything.
- A background refetch never disrupts in-progress local state: it doesn't
  reset filters, close dialogs, drop the POS cart, or replace good data with
  an error screen when it fails.
- The mechanism is small and screen-local: an optional interval on
  `useLoad`, plus a POS-specific interval for `stockByProduct`. No new
  abstraction shared beyond that.

**Non-Goals:**

- No WebSocket, SSE, or any backend push mechanism.
- No migration to SWR, React Query, or any other data-fetching library.
- No cross-tab coordination (`BroadcastChannel`) to dedupe polling across
  multiple tabs of the same user.
- No visible "last updated" indicator or loading affordance for background
  refreshes (see Decision 5).
- Return registration gains a refunded-payment distribution so the backend can
  preserve equality between the mutated sale total and its payment amounts.
- No screen outside `PosView`, `SalesView`'s summary cards, `InventoryView`,
  `SalesReportView`, and the existing sale-return detail flow. The reports
  dashboard, `ProductsReportView`, `PurchasesReportView`, and
  `InventoryValuationView` are unaffected.

## Decisions

### 1. Polling interval: 30 seconds, uniform across the four screens

30s balances reasonable freshness for a low/medium-volume kiosk against
avoidable backend load, applied the same way to all four screens rather than
tuned per screen (e.g. a faster POS interval and a slower Reports interval).
A uniform value keeps the mechanism simple and avoids introducing a
per-screen tuning knob that nothing in the requirement asked for.
Alternative considered: a shorter POS interval (e.g. 15s) since it's the
sale-blocking path. Rejected for this change — 30s already resolves the
concrete failure mode (a cashier blocked by a stale stock number can retry
adding the item within half a minute of the return being registered
elsewhere), and a differentiated interval can be revisited later if 30s
proves too slow in practice, without a spec change (it's an internal
constant, not observable contract).

### 2. Centralize polling in `useLoad` for the three screens that already use it

`useLoad` gains an optional second argument, e.g. `useLoad(fetcher, {
pollMs })`. When `pollMs` is set, the hook re-invokes `fetcher` every
`pollMs` while mounted, in addition to the existing effect-on-`fetcher`-
change behavior, without resetting `data`/`error` before the new result
lands (background refetch keeps the previous value visible while in
flight). `SalesView`, `InventoryView`, and `SalesReportView` opt in by
passing `pollMs` to their existing `useLoad(fetcher)` calls — no change to
call sites beyond that argument and no change to loading/error/reload
semantics for the initial load or manual retry.

Alternative considered: a separate `usePolledLoad` hook. Rejected — it would
duplicate the cancellation/error-shape logic already in `useLoad` for no
behavioral gain, and every consumer would need to choose between two
near-identical hooks.

### 3. Background refetch failures are swallowed, not surfaced

A refetch triggered by the interval (as opposed to the initial mount or an
explicit `reload()`) that rejects does not call `setError`. It's logged (or
silently dropped) and the existing `data` stays on screen; the next interval
tick tries again. This requires `useLoad` to distinguish "this fetch is the
initial/reload one" from "this fetch is a background poll tick" internally.
`ErrorState`/the retry affordance remains exactly as it is today for the
initial load and manual retry — this decision only changes what happens
when a *background* tick's promise rejects.

Alternative considered: surface a subtle non-blocking indicator on repeated
poll failures (e.g. after N consecutive failures). Rejected as unnecessary
complexity beyond what the requirement asked for; out of scope per Decision
5 below, revisitable later.

### 4. `PosView`'s `stockByProduct` gets its own timer, not `useLoad`

`stockByProduct` isn't a single `fetcher`/`useLoad` call — it's a
per-`productId` cache populated at multiple call sites (scan, add-to-cart,
retry-add, quantity guard). It keeps its own `setInterval` inside `PosView`
that, every `pollMs`, re-requests `GET /inventory/stock/{product_id}` for
every `productId` currently present as a key in `stockByProduct` (i.e.
every product already looked up this session) and updates the cached value
in place. Products never looked up are not proactively fetched — the
existing lazy-populate-on-first-lookup behavior is unchanged; only already-
cached entries are kept fresh.

This does not touch the cart itself: a product already in the cart keeps
its line; the refreshed number only affects what a subsequent add/quantity
change is validated against, per the "Desired behavior" requirement on this
point. The refreshed value takes effect the moment it lands, superseding
whatever guard was based on the stale number.

### 5. No polling status indicator

Not requested, and adding one (a "refreshing…"/"actualizado hace Xs"
affordance) is new copy and new UI surface beyond a background-data-freshness
fix. The refresh stays invisible: no skeleton, no flicker, no toast, unless
a future change decides otherwise.

### 6. Pause polling when the tab is hidden

`useLoad`'s poll timer and `PosView`'s stock-refresh timer both skip firing
a tick while `document.visibilityState !== "visible"` (checked at tick time,
not via a `visibilitychange` listener that restarts the interval — simpler
and avoids resetting the interval's phase on every tab-switch). This is a
low-cost optimization for a user's own hidden tab; it does not weaken the
cross-device case, which is the one that matters for the return scenario:
the screen that actually needs the fresh number is, by definition, visible
to whoever is looking at it. When the tab becomes visible again, the
existing interval simply resumes ticking (no forced immediate refetch on
refocus, since that's a different mechanism — window-focus revalidation —
explicitly out of scope here).

Alternative considered: no visibility check at all (always poll). Rejected
as needless load on backend/battery for a tab nobody is looking at, with no
requirement forcing it.

### 7. `stockByProduct` refresh interacts with `pos-draft-recovery-and-stock-in-product`, not conflicts with it

The open, backend-blocked change `pos-draft-recovery-and-stock-in-product`
plans to change **how `stockByProduct` gets its first value** for a product
(from an embedded `stock` field on the product response, instead of a
separate `GET /inventory/stock/{id}` call). This change adds a **periodic
refresh of already-cached values** — a different concern applied to the same
cache. Nothing in the earlier change's proposal or design mentions a timer
or invalidation, so there's no requirement conflict; the risk is purely
mechanical (both touch the same lines of `PosView.tsx`). See "Migration
Plan" for sequencing.

## Accessibility

A background refetch that changes visible numbers (stock quantity, a card's
total) must not add a fresh `aria-live="polite"` region that announces every
30s — that would be noise, not a real update a screen-reader user asked for.
Any existing `aria-live` region reserved for error/status messages on these
screens is untouched by this change and not reused to narrate routine
refreshes.

## Keyboard and focus behavior

No change. A background refetch never moves focus, never closes a dialog,
and never resets the POS scan-input focus loop.

## Responsive behavior

No change to layout or breakpoints on any of the four screens.

## API contract

`POST /sales/{id}/returns` adds a refund payment distribution whose
decimal-string amounts equal the returned merchandise amount. The backend
persists the immutable return and atomically reduces the originating sale's
total and payment amounts.

The same five refresh endpoints, same parameters, are called on the same
schedule of triggers as today, plus a timer-driven repeat of the same request:

- `GET /reports/sales/summary?from=&to=` (admin `DailySummaryCards`, fixed
  to today)
- `GET /sales/today-summary` (cashier `CashierTodaySummaryCards`)
- `GET /inventory/stock/{product_id}` (POS `stockByProduct`, per cached
  `productId`)
- `GET /inventory/stock?search=&category_id=&low_stock_only=&page=&limit=`
  and the low-stock-ids variant (`InventoryView`)
- `GET /reports/sales/daily-breakdown?from=&to=&page=&limit=` and
  `GET /reports/sales/summary?from=&to=` (`SalesReportView`, in parallel, as
  today)
- `GET /sales/{id}` and `GET /sales/{id}/returns` (`SaleDetail`, in parallel,
  preserving the existing local net-total behavior until backend rollout)

## Return accounting

Within the same transaction that persists the immutable return record and
restores stock, the backend reduces the originating confirmed sale's persisted
total and its payment-method amounts by the supplied refund distribution. The
existing lists, summaries and reports then observe net figures from their
current backend queries, without a frontend aggregation.

The result remains attributed to the sale's original `confirmed_at` business
day. The return keeps its own `created_at`; the sale exposes `updated_at` so a
future audit view can identify post-confirmation changes. Sale items remain
the original snapshot; immutable return items record what was removed.

## Error handling

See Decision 3. Initial load and manual `reload()` keep today's `ApiError`
→ `ErrorState` handling unchanged. A background poll tick's rejection is
swallowed and retried on the next tick; it never replaces `data` with
`null` and never triggers `ErrorState`.

`401` during a background poll follows whatever the existing `api()`
wrapper already does for any request (session-expired handling is
unchanged by this proposal — it's not a new error path, just a request that
now also happens on a timer).

## Backend coordination

Required before the frontend changes `SaleDetail` from its current local
net-total calculation to trusting `GET /sales/{id}`. The verified backend
currently keeps confirmed sales immutable and summary queries ignore returns.
`backend-request.md` records the required contract and rollout gate.

## Risks / Trade-offs

- [30s can still feel slow for the POS's blocking-a-sale case] → accepted
  per Decision 1; revisitable as a constant change later without touching
  the spec.
- [N tabs of the same user multiply polling load N times] → accepted,
  matches the approved scope (no `BroadcastChannel` coordination); kiosk
  traffic is low-volume enough that this is not expected to matter in
  practice.
- [A filter change and a poll tick landing at nearly the same time] →
  already covered by `useLoad`'s existing `cancelled` flag inside its
  effect: a stale in-flight response from a superseded `fetcher` is
  discarded, whether the fetcher changed because of a filter or because a
  poll tick recreated the same fetcher's call. No new race is introduced.
- [Coordination with `pos-draft-recovery-and-stock-in-product`] → see
  Decision 7 and Migration Plan; both changes touch `stockByProduct` in
  `PosView.tsx` but address different concerns (population source vs.
  periodic refresh of already-cached entries), so they don't need to be
  merged into one change — only sequenced or rebased against each other at
  implementation time.
- [Backend rollout before frontend detail change] → removing the current local
  net-total calculation before the backend deploys would make returns disappear
  from the displayed sale total.
- [Uncommitted local changes already present in `PosView.tsx`] → noted in
  the proposal's Impact; implementation of this change should rebase
  cleanly on top of whatever lands first among the working-tree changes,
  this change, and `pos-draft-recovery-and-stock-in-product`.

## Migration Plan

Deploy the backend mutation first. Then make `SaleDetail` consume the net
total and payment amounts directly, avoiding a second subtraction of its
return history. Sequencing note only: if
`pos-draft-recovery-and-stock-in-product` implements its `stockByProduct`
population change before this one, this change's per-`productId` refresh
timer is layered on top of whatever populates the cache at that time
(either the current `GET /inventory/stock/{id}` lookup or the embedded
`stock` field), without depending on which one is in place. If this change
lands first, `pos-draft-recovery-and-stock-in-product`'s later
implementation should account for the refresh timer already iterating
`stockByProduct`'s keys. Either order is safe; only the diff needs manual
coordination to avoid clobbering the other change's edit to the same
region of `PosView.tsx`.

## Rollback

Rollback first restores the frontend's local detail net-total calculation and
the old return payload, then reverts the backend transaction/contract. The
return audit records and stock movements remain; rolling back does not erase
them. Reverting only the polling timers remains a plain frontend code revert.

## Open Questions

- Whether to also extend `InventoryView`'s per-product stock-detail dialog
  and its movements panel with the same periodic refresh: not requested
  explicitly and left out of this change's spec deltas; could be added
  later for consistency.
