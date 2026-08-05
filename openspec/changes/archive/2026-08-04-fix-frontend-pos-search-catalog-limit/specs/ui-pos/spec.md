## ADDED Requirements

### Requirement: Manual product search covers the full active catalog

The POS manual product search (by name or SKU, in the same search field used
today) SHALL query `GET /api/v1/products?q=<term>&active=true&limit=8` for
the cashier's current search term instead of filtering a locally cached,
size-limited catalog. Every active product matching the term SHALL be
findable through this search regardless of how many active products the
kiosk has, including products beyond the first 100 in alphabetical order.
The request SHALL be debounced so it fires only after the cashier pauses
typing, and SHALL NOT fire while the search term is empty. A response that
arrives for a term the cashier has since changed SHALL be discarded without
updating the displayed results or status message.

#### Scenario: Product beyond the first 100 is found

- **WHEN** the kiosk has more than 100 active products and the cashier types
  a term matching only a product alphabetically past the 100th
- **THEN** that product appears among the search results

#### Scenario: Search does not fire on every keystroke

- **WHEN** the cashier is actively typing in the search field
- **THEN** no request is sent until typing pauses

#### Scenario: Empty search term sends no request

- **WHEN** the search field is empty
- **THEN** no search request is sent and no results are shown

#### Scenario: A stale response is discarded

- **WHEN** the cashier changes the search term again before a request for
  the previous term has resolved, and that earlier request later resolves
- **THEN** its results are not applied and the results shown correspond
  only to the current search term

#### Scenario: Inactive products are excluded

- **WHEN** the search term matches both an active and an inactive product
- **THEN** only the active product appears in the results

#### Scenario: Results respect the existing eight-result cap

- **WHEN** more than eight active products match the current search term
- **THEN** at most eight results are shown, exactly as before this change

#### Scenario: Selecting a result behaves exactly as before

- **WHEN** the cashier selects a search result with the keyboard or the
  pointer
- **THEN** the product is added to the cart via the same path used today,
  the search term clears, and keyboard focus returns to the scan input for
  non-`pesable` products, unchanged from current behavior

#### Scenario: Loading covers the in-flight request for the current term

- **WHEN** a search request for the cashier's current term has not yet
  resolved
- **THEN** the "Buscando…" status message is shown in place of results

#### Scenario: No matches for the current term

- **WHEN** a search request for the current term resolves with zero results
- **THEN** the message `Ningún producto activo coincide con "<término>".` is
  shown, using the trimmed current search term

#### Scenario: Search request failure is shown like other entry errors

- **WHEN** a search request fails
- **THEN** the backend's error message is shown in the same entry-status
  region used for other entry errors today, at the same priority (below an
  unknown-barcode, inactive-product, or stock-limit message; above the
  search status message)

#### Scenario: Barcode scanning is unaffected

- **WHEN** a barcode is scanned, regardless of how many active products the
  kiosk has or where the resolved product would sort alphabetically
- **THEN** the scan resolves via `GET /api/v1/products/barcode/{barcode}` and
  behaves exactly as it did before this change, independent of the manual
  search's data source
