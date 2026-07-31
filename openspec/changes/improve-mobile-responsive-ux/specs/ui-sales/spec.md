## MODIFIED Requirements

### Requirement: Operational sales list
The frontend SHALL show the operational sales list from `GET /api/v1/sales`. Role `admin` SHALL see every sale and SHALL have a cashier filter; role `inventory` SHALL be redirected away without a request being issued. Role `cashier` access is governed by the own-sales requirement below. The list SHALL default to confirmed sales and SHALL support filtering by status, date range, and cashier, with pagination. Draft and confirmed sales SHALL be visually distinguished by a labelled badge, never by colour alone, and no aggregate total displayed over the list SHALL include drafts. The number of rows requested per page SHALL adjust to the viewport actually available (both the desktop table and the mobile card list) instead of a fixed count, clamped to a minimum and maximum row count, so that a standard desktop or tablet viewport does not force page-level scroll to see the list; the frontend SHALL recompute this count and return to the first page whenever the viewport is resized in a way that changes how many rows fit.

For an Admin, below the `md` breakpoint the sale-number search (governed by "Find a sale by number") SHALL remain directly visible; the status, cashier, and date-range filters SHALL collapse into the shared collapsible filter group. This does not apply to the cashier-only view, which already omits the cashier filter and the date range entirely.

#### Scenario: Admin lists sales
- **WHEN** an Admin opens the sales section
- **THEN** confirmed sales are listed newest first, paginated

#### Scenario: Drafts are visible and unmistakable
- **WHEN** the status filter includes drafts
- **THEN** each draft is marked with a labelled badge, shows no sale number, and its total is presented distinctly from a closed sale's

#### Scenario: Drafts never inflate totals
- **WHEN** the list displays any aggregate figure and drafts are present
- **THEN** that figure excludes drafts

#### Scenario: Inventory Manager cannot reach the section
- **WHEN** a user with role `inventory` navigates directly to the sales URL
- **THEN** they are redirected away and no request to `/api/v1/sales` is issued

#### Scenario: Date column states its meaning
- **WHEN** drafts and confirmed sales appear together
- **THEN** creation and confirmation dates are shown as separately labelled values rather than a single ambiguous date column

#### Scenario: Page size fits the viewport instead of overflowing it
- **WHEN** the sales list is rendered on a standard desktop viewport
- **THEN** the number of rows requested for that page is sized to what fits below the filters without forcing the page to scroll vertically, within a fixed minimum and maximum row count

#### Scenario: Resize recomputes the page size
- **WHEN** the browser window is resized (including a viewport change that crosses the breakpoint between the desktop table and the mobile card layout) while the sales list is mounted
- **THEN** the frontend recomputes how many rows fit for whichever layout is now visible and returns the list to its first page

#### Scenario: Sale-number search stays visible on mobile for Admin
- **WHEN** an Admin views the sales list below the `md` breakpoint
- **THEN** the sale-number search remains visible without expanding any collapsed group

#### Scenario: Secondary filters are collapsed by default on mobile for Admin
- **WHEN** an Admin views the sales list below the `md` breakpoint
- **THEN** status, cashier, and date-range filters are reachable inside a collapsed group, not expanded by default, and no aggregate figure or the list itself requires scrolling past them to see the first result

### Requirement: Sale detail remains compact on notebook viewports
The sale detail view SHALL preserve all sale items, quantities or weights, prices, subtotals, payments, status, sale number and relevant date required by this capability. At desktop and tablet breakpoints, the item table SHALL use a compact, consistent row density appropriate for 1024×768 and 1366×768 notebook viewports, without duplicated vertical padding between the table cell and its content. Compactness SHALL NOT remove data, reduce body text below the design-system legibility floor, or replace semantic table headers with a visually styled non-table structure.

#### Scenario: Detail fits a notebook viewport proportionally
- **WHEN** an Admin or authorized cashier opens a sale detail at 1024×768 or 1366×768
- **THEN** the item table remains readable, its columns stay aligned, and no row is enlarged by duplicated container/content padding

#### Scenario: Detail data remains complete after compaction
- **WHEN** a sale contains multiple items, corrected prices, or multiple payments
- **THEN** every required value and its semantic label remains available, with corrected prices still distinguishable by strike-through plus non-colour text or accessible explanation

#### Scenario: Long product names do not break the compact table
- **WHEN** an item has a long product name or a return-status badge
- **THEN** the product column wraps or applies an explicit complete-content strategy without overlapping numeric columns or producing page-level horizontal overflow
