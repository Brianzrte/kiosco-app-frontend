## 0. Prerequisites

- [x] 0.1 Confirm `src/components/pos/PosView.tsx`'s in-progress local
      changes (`add-frontend-weighable-stock-tracking`,
      `remove-frontend-pos-stock-shortcut`) have been committed/consolidated
      before starting implementation, to avoid conflicting with the
      `loadCatalog`/`searchResults` region touched here. (Coordination check,
      not a code change — inspection of `git status` before starting.)

## 1. Pure helpers (`lib/`)

- [x] 1.1 Add a pure query-builder function (mirroring `buildStockQuery` in
      `lib/inventory.ts`) that takes a trimmed search term and returns the
      `q=<term>&active=true&limit=8` query string for
      `GET /products`. Add `lib/*.test.ts` cases: term is URL-encoded
      correctly, `active` and `limit` are always present, and the function
      is not called (per design, Decision 3/5) with an empty term — assert
      its output for a representative non-empty term. **Automated test.**
- [x] 1.2 Rename `EntryStatusInput.catalogErrorMessage` to
      `searchErrorMessage` in `lib/posStatus.ts`, updating its docstring to
      describe a failed search request instead of a failed catalog load.
      Keep its position in `resolveEntryStatus`'s priority chain unchanged.
      **Inspection** (type rename, no behavior change) plus update of the
      existing `lib/posStatus.test.ts` cases that reference the old field
      name. **Automated test** (existing suite continues to pass with the
      renamed field).

## 2. `PosView.tsx` — replace catalog load with debounced server search

- [x] 2.1 Remove `loadCatalog()`, `catalog`/`catalogRequested` state, and the
      `?limit=100` full-catalog request. **Inspection**: confirm no other
      reference to `catalog` remains (only `loadCatalog`/`searchResults` per
      the requirement analysis).
- [x] 2.2 Add a debounced (300 ms) effect, following `InventoryView.tsx`'s
      precedent, that turns the raw search-field value into the term used
      for querying, without firing while the term is empty.
- [x] 2.3 Add the effect that fires `GET /products?<query from 1.1>` for the
      debounced term, using effect-cleanup cancellation (design.md,
      Decision 4) so a response for a superseded term is never applied.
      Wire its result into `searchResults`, its failure into
      `searchErrorMessage` (renamed per 1.2), and derive the "Buscando…"
      status for the period the current term's request is in flight.
- [x] 2.4 Confirm `searchStatusMessage`/`entryStatusMessage` continue to use
      the existing priority order and existing copy
      (`"Buscando…"`, `` `Ningún producto activo coincide con "${term}".` ``)
      unchanged. **Inspection**.
- [x] 2.5 Confirm `pickSearchResult`, `submitSearch`, and
      `handleSearchKeyDown` need no changes beyond reading from the new
      `searchResults` source. **Inspection**.

## 3. `ScanOmnibox.tsx`

- [x] 3.1 Confirm no prop-contract change is needed
      (`searchTerm`, `searchResults: Product[]`, `onSearchTermChange`, etc.
      stay the same shape). **Inspection**; only touch this file if 2.2/2.3
      end up needing to move debounce/fetch ownership here instead of
      `PosView.tsx` — if so, update this task list before proceeding rather
      than doing it silently.

## 4. Tests and validation

- [x] 4.1 `npm run lint`
- [x] 4.2 `npm test`
- [x] 4.3 `npm run build` (this change does not touch `page.tsx` or
      `route.ts`, but touches shared types/state in `PosView.tsx`; run build
      to confirm no type regressions). Passed in the user's environment on
      2026-08-04; this sandbox's earlier attempt was blocked only by fetching
      the existing Geist Google Fonts.

## 5. Manual verification (no component/DOM test runner in this repo)

- [x] 5.1 Seed or use a kiosk catalog with more than 100 active products;
      confirm a product alphabetically past the 100th is found by manual
      search. **Manual, backend real** (requires a real or seeded backend
      instance with that data volume).
- [x] 5.2 Confirm the search does not fire a request on every keystroke
      (network tab), only after the debounce pause. **Manual**.
- [x] 5.3 Confirm typing a term, then quickly changing it before the first
      request resolves, never shows the first term's results once the
      second term's request resolves (simulate with throttled network or a
      temporary artificial delay). **Manual**.
- [x] 5.4 Confirm keyboard navigation (arrows, Enter, Escape), focus return
      to the scan input after picking a result, and the "never block the
      next scan" behavior are all unchanged. **Manual**.
- [x] 5.5 Confirm an inactive product does not appear in search results.
      **Manual, backend real**.
- [x] 5.6 Confirm a search request failure (e.g. simulate offline) shows the
      same error slot/style used today for a catalog-load failure, with the
      correct priority against unknown-barcode/inactive-product/stock-limit
      messages. **Manual**.
- [x] 5.7 Confirm barcode scanning behaves identically to before this
      change, for a product both within and beyond the first 100
      alphabetically. **Manual, backend real**.
- [x] 5.8 Responsive/accessibility spot-check: search field and results list
      remain usable at 320 px width; no new visual regression from this
      change (layout is unchanged, but confirm the loading/error states
      render as before). **Manual**.

## 6. Sync and archive (do not execute — requires explicit user decision)

- [ ] 6.1 Sync `ui-pos` spec and archive this change, only after
      implementation is complete, verified against a real backend instance,
      and the user explicitly requests it.
