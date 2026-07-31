## 1. Contract and design prerequisite

- [x] 1.1 Confirm the current `GET /api/v1/reports/sales/daily-breakdown?from=&to=` contract and its lack of pagination; inspection of frontend fetch and backend route.
- [x] 1.2 Backend prerequisite: implement and merge the paginated `daily-breakdown` contract described in `backend-request.md`; verified in backend commit `c760834` on `develop`/`origin/develop`, including application tests for defaults and invalid values.

## 2. Sales report filters

- [x] 2.1 Move Hoy, Ayer, Semana, Mes, and Últimos 6 meses into the existing `CollapsibleFilters` content in `SalesReportView.tsx`.
- [x] 2.2 Initialize and maintain the selected preset state with Mes selected for the current calendar-month range; clear it when either date is edited.
- [x] 2.3 Preserve preset behavior, editable date inputs, refetching, and existing report data states without changing date semantics; verified by scoped diff and successful build.
- [x] 2.4 Keep the filter panel usable at 320 px and operable by keyboard with visible selected/focus states; responsive/accessibility review confirmed manually by the requester.
- [x] 2.5 Render the summary carousel before the filters and the daily listing in success, loading, empty, and error states; code and manual review confirmed manually by the requester.

## 3. Backend-paginated sales rows

- [x] 3.1 Update the daily-breakdown response type and request to consume backend `page`, `limit`, and `total`; verified against merged backend DTO and successful build.
- [x] 3.2 Replace client-side slicing with server-page navigation while preserving the existing table/cards and empty/error/loading states; verified by scoped implementation and typecheck.
- [x] 3.3 Fetch range summary totals from the existing `sales/summary?group_by=payment_method` aggregation so changing pages does not change the summary cards; verified against backend DTO and `buildSummaryQuery` contract.
- [x] 3.4 Limit each daily row to three visible cashier badges and expose omitted names through the `...` badge label and tooltip.
- [x] 3.5 Verify first/last page, empty range, range change resets page, and no duplicate/missing days against a running backend; confirmed manually by the requester.

## 4. Validation

- [x] 4.1 Run `npm test` — 16 test files and 132 tests passed.
- [x] 4.2 Run `npm run lint` — passed on retry after a transient workspace `.agents` scan error.
- [x] 4.3 Run `npm run build` because the client view changed — passed.
- [x] 4.4 Run `git diff --check` and inspect the scoped diff; verify no dashboard, sales-by-product, or backend files changed.
