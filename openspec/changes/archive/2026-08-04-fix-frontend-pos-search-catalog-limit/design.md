## Context

`PosView.tsx` loads the entire active-and-inactive catalog once with
`GET /products?limit=100` (`loadCatalog()`) and filters it client-side by
`name`/`sku` for the manual search box inside `ScanOmnibox`. The backend caps
any page at `maxLimit = 100` (`../backend/internal/shared/pagination/pagination.go`)
and always orders by `name`. A kiosk with more than 100 active products has
products past the 100th alphabetically that this search can never surface,
with no indication to the cashier that the list is incomplete. Barcode
scanning (`scan()`) is unaffected: it calls
`GET /products/barcode/{barcode}` per code and never reads `catalog`.

`GET /products` already supports `?q=` (ILIKE over `name`, `sku`, `barcode`),
`?active=`, and standard pagination, and is already consumed this way by
`ProductsView.tsx` (`page.tsx` pattern: build `URLSearchParams`, call
`api<ProductList>`) and `InventoryView.tsx` (debounced 300 ms before
querying). This change moves the POS manual search to the same server-side
pattern and removes the now-unused full-catalog load.

## Goals / Non-Goals

**Goals:**
- Every active product matching the cashier's search term is findable,
  regardless of catalog size.
- Preserve today's observable search UX exactly: same copy, same 8-result
  cap, same keyboard/focus behavior, same status-message priority.
- Handle out-of-order network responses introduced by moving from an
  instant client-side filter to a per-keystroke server request.

**Non-Goals:**
- Changing the barcode-scan flow.
- Raising or otherwise changing the 8-result cap.
- Adding new search filters (category, etc.) to the POS search box.
- Any backend contract or business-rule change.
- Changing `ScanOmnibox.tsx`'s public prop contract
  (`searchTerm`, `searchResults: Product[]`, `onSearchTermChange`, etc.):
  this stays the same shape; only where `PosView.tsx` sources
  `searchResults` from changes.

## User flow

Unchanged from the cashier's perspective: type in the same search field,
see results appear below it, navigate with arrow keys or the mouse, pick one
with `Enter`/click (`pickSearchResult`), which calls the same `addToCart`
used by scanning. What changes internally is that `searchResults` is now
populated from a debounced, per-term backend query instead of a filter over
a fully cached catalog.

## UI states

- **Loading:** the existing "Buscando…" message covers not only the very
  first search but every period during which a request for the *current*
  search term is in flight — including while the debounce timer is still
  running before that request is even sent, since no results exist for the
  current term yet. This differs from today only in that it now also covers
  the network round-trip per term, not just an initial full-catalog load.
- **Empty:** unchanged copy —
  `` `Ningún producto activo coincide con "${searchTerm.trim()}".` ``
  — shown once a request for the current term has resolved with zero
  results.
- **Error:** unchanged mechanism — the existing error slot in
  `resolveEntryStatus` (today `catalogErrorMessage`) is populated from a
  failed search request instead of a failed full-catalog load, with the same
  priority (below unknown-barcode/inactive-product/stock-limit, above the
  search status message).
- **Success:** unchanged — up to 8 results, same layout and interaction.

## Decisions

### 1. Server-side search per term, not a cached full catalog

Replace `loadCatalog()` + client-side `.filter()` with a query to
`GET /products?q=<term>&active=true&limit=8` fired per (debounced) search
term. This is the only option that removes the 100-product ceiling, and it
reuses an endpoint contract already proven by `ProductsView.tsx` and
`InventoryView.tsx` in this same repo — no new backend work, no new pattern
to review.

### 2. Debounce at 300 ms, following `InventoryView.tsx`'s precedent

The POS search fires a request 300 ms after the cashier stops typing,
matching `InventoryView.tsx`'s existing debounce (`InventoryView.tsx:63-70`).
Alternative considered: no debounce, firing on every keystroke like
`ProductsView.tsx`. Discarded for the POS specifically because it is the
highest-frequency, most latency-sensitive screen in the app (scan-first,
"never block the next scan" is a hard requirement elsewhere in `ui-pos`);
firing a request per keystroke would multiply backend calls without any
benefit to the cashier, who cannot act on partial results faster than the
debounce window regardless.

No minimum character count is introduced: today's client-side filter already
matches on any non-empty substring, including a single character, and
introducing a minimum would be a behavior change outside this fix's scope.

### 3. Result cap enforced server-side via `limit=8`

Request `limit=8` directly instead of requesting a larger page and slicing
client-side. This keeps the fix minimal (no local slicing logic to
maintain), matches the already-approved cap ("Out of scope: subir o cambiar
el límite visible de 8 resultados" — the cap itself is unchanged, only how
it's enforced), and avoids ever transferring more rows than can be shown.

### 4. Stale-response handling via effect-cleanup cancellation, not a request-ID counter

Guard against a late response from an older term overwriting a newer term's
results using the same closure-based cancellation pattern already
established by `useLoad` (`src/lib/useLoad.ts`): the effect that fires the
search request captures a local `cancelled` flag, and its cleanup (which
React runs before applying a newer term) sets that flag so the resolving
promise's `.then`/`.catch` is a no-op when it arrives after being superseded.

Alternative considered: a pure helper comparing "the term this response was
requested for" against "the term currently displayed" at response time.
Discarded because the effect-cleanup pattern is simpler, is the same
mechanism already trusted elsewhere in this codebase for the identical
problem (a fetch racing against newer input), and doesn't require passing
the requested term through the response handler by hand. This piece is a
`useEffect` closure, not extractable as a pure function, and is therefore
verified by manual testing (rapid typing) rather than a `lib/*.test.ts` case
— consistent with `useLoad` itself having no dedicated unit test today.

Reusing `useLoad` directly (instead of a dedicated effect) was also
considered and discarded: `useLoad` never clears `data` when its `fetcher`
identity changes (only `reload()` does), so switching from one search term
to another would keep displaying the previous term's results while the new
term's request is in flight — which contradicts the "Buscando…" state
covering the in-flight period for the *current* term (see UI states above).
A dedicated effect can reset the visible results to "no results yet" the
moment the term changes, before firing the new request.

### 5. Query-string construction extracted to a pure, tested helper

The `q`/`active`/`limit` query string is built by a small pure function in
`src/lib/`, mirroring `buildStockQuery` (`lib/inventory.ts`) and
`buildSummaryQuery` (`lib/salesSummary.ts`). This is the only piece of new
logic in this change that is meaningfully pure and worth a `lib/*.test.ts`
case; everything else (debounce timing, request firing, stale-response
cancellation) is React effect wiring verified manually.

### 6. `EntryStatusInput.catalogErrorMessage` is renamed to reflect the new source

`lib/posStatus.ts`'s `EntryStatusInput.catalogErrorMessage` field (and its
docstring, "The client-side search catalog failed to load") no longer
describes what populates it once the full-catalog load is removed. It is
renamed to `searchErrorMessage` with an updated docstring ("A product search
request failed"), keeping its priority position in `resolveEntryStatus`
unchanged. This is an internal rename with no observable behavior change, so
it does not require a spec update, but it does require updating
`posStatus.test.ts` and every call site (`PosView.tsx`,
`CheckoutStatus.tsx` only references `resolveCheckoutStatus`, not this
field — confirmed no other consumer).

## Accessibility

Unchanged: status messages continue to resolve through
`resolveEntryStatus`/`entryStatusIsError`; the consuming component keeps
whatever `role="alert"`/live-region treatment it already applies. No new
accessible name, label, or landmark is introduced.

## Keyboard and focus behavior

Unchanged: arrow-key navigation (`activeResultIndex`), `Enter` to select
(`submitSearch`), `Escape` to dismiss (`searchDismissed`), and focus
returning to the scan input after a pick (`refocus()`) all keep their
current behavior. The debounce and network round-trip must never trap focus
or block typing in the search field — the field remains a plain controlled
input at all times, independent of whether a request is in flight.

## Responsive behavior

Unchanged. No layout or breakpoint changes.

## API contract

- `GET /api/v1/products?q=<term>&active=true&limit=8` — same endpoint,
  method, and roles already used by `loadCatalog()` today (any authenticated
  role reaching `PosView`, i.e. `cashier` or `admin` per
  `app/(app)/page.tsx`'s `requireRole(["cashier", "admin"])`); registered on
  the shared `protected` mux
  (`../backend/internal/catalog/transport/http/routes.go:9`,
  `RegisterReadRoutes`), no role middleware beyond authentication.
  Response shape is the existing `ProductList` (`{ products: Product[],
  total: number }`), unchanged.
- Errors: `400` if `active` is an unparseable boolean (not reachable here,
  since the frontend always sends the literal `true`); any other failure
  surfaces through the same `ApiError`/`{ message }` handling `api()`
  already normalizes, landing in the same error slot `catalogErrorMessage`
  (renamed `searchErrorMessage`) already uses today.
- No `401`/`403` distinction changes: a `401` means an invalid session and
  is handled by the existing global redirect-to-login behavior in `api()`;
  a `403` is not expected for this endpoint given the current role gate,
  and none of this change's decisions touch that gate.
- The full-catalog request (`GET /products?limit=100` without `q`) is
  removed; no other part of `PosView.tsx` depends on it (confirmed: `catalog`
  has no consumer besides `loadCatalog`/`searchResults`).

## Error handling

Same pattern as the rest of the repo: `ApiError.message` from the backend is
shown verbatim in the existing error slot. No new error code is introduced.
A failed search request does not clear whatever results are already
displayed from a still-valid earlier term other than through the normal
state transition (request fails for the current term → error message shown
instead of results, exactly like a full-catalog load failing today).

## Backend coordination

None needed. `?q=`, `?active=`, and pagination are already deployed and
already consumed elsewhere in this repo; no `backend-request.md` is created.

## Risks / Trade-offs

- [More backend requests than today] → Bounded by the 300 ms debounce and by
  only firing while the search field is non-empty and focused/used, same
  gating condition (`value.trim()`) that already exists before triggering
  today's `loadCatalog()`.
- [Out-of-order network responses could show stale results] → Mitigated by
  the effect-cleanup cancellation described in Decision 4.
- [Losing the "search everything already loaded, instantly" feel] →
  Accepted trade-off: the 300 ms debounce plus network round-trip is
  slightly slower per keystroke than the old instant local filter, but is
  the only way to make products beyond position 100 findable at all. This
  matches the already-accepted UX of `InventoryView.tsx`'s manual search.

## Migration Plan

No persisted state or backend contract changes. Rollout is entirely
frontend: replace the full-catalog load and client-side filter with the
debounced server-side query in one deploy. No feature flag or staged
rollout is warranted given the size and reversibility of the change.

## Rollback

Revert the frontend change; no data migration or backend coordination to
undo. The removed full-catalog code path can be restored from version
control if needed.

## Open Questions

None blocking. Previously open, now resolved by the decisions above:
debounce value (Decision 2), how the 8-result cap is enforced (Decision 3),
and the stale-response guard mechanism (Decision 4). Real per-kiosk product
volume today remains unverifiable from this repo and does not block this
fix, since the bug is structural for any kiosk exceeding 100 active
products regardless of how common that is today.
