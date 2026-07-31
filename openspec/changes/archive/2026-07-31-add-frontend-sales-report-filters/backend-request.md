# Backend request: paginate the daily sales breakdown

## 1. Context and user need

The sales report currently requests every day in the selected range from `GET /api/v1/reports/sales/daily-breakdown` and slices the returned array in the frontend. Long ranges therefore load all rows before showing the first page. The frontend needs server-side pagination while keeping the summary cards accurate for the complete selected range.

## 2. Verification and current state

Verified on 2026-07-31 against the backend repository after backend commit `c760834` (`develop` and `origin/develop`):

- `../backend/internal/bootstrap/router.go` and `../backend/internal/reporting/transport/http/routes.go` expose `GET /api/v1/reports/sales/daily-breakdown` behind the Admin report boundary.
- `../backend/internal/reporting/transport/http/handler.go:163-177` forwards `from`, `to`, `page`, and `limit` and serializes pagination metadata.
- `../backend/internal/reporting/application/sales_daily_breakdown.go` defaults to `page=1`, `limit=25` and rejects invalid pagination values. The frontend explicitly requests `limit=20` to match the fixed page-size pattern used by Products and Historial.
- `../backend/internal/reporting/infrastructure/postgres_report_queries.go:319-351` returns one page and the stable total row count.
- `../backend/internal/reporting/transport/http/dto.go:180-207` confirms `{ days, page, limit, total }`.
- `../backend/internal/reporting/application/sales_daily_breakdown_test.go` covers defaults and invalid values.

The paginated backend contract now exists in the merged backend commit and is ready for frontend consumption.

## 3. Requested contract

### Endpoint

- **Method:** `GET`
- **Path:** `/api/v1/reports/sales/daily-breakdown`
- **Role:** Admin, same authorization as the existing endpoint
- **Query:** required `from` and `to` (`YYYY-MM-DD`), optional positive `page` and `limit`; the frontend requests `page=1` and `limit=20`.

### Response

Keep each existing day row unchanged and add pagination metadata:

```json
{
  "days": [
    {
      "date": "2026-07-31",
      "total_sales": 4,
      "total_amount": "1200.00",
      "by_payment_method": [{ "method": "CASH", "total_amount": "1200.00" }],
      "cashiers": [{ "cashier_id": "uuid", "cashier_name": "Ana", "total_amount": "1200.00" }]
    }
  ],
  "page": 1,
  "limit": 25,
  "total": 42
}
```

`total` must be the total number of daily rows with confirmed sales in the selected range, not the number of rows in the current page. Ordering must remain ascending by calendar date. The endpoint must not group individual sales in the frontend.

### Errors

- `400` with `{ "message": "..." }` for missing/invalid dates or invalid pagination values.
- `401` for an unauthenticated request.
- `403` for an authenticated non-Admin request.
- Existing `5xx` behavior remains unchanged.

## 4. Frontend impact and coordination

The frontend will:

1. Request `page` and `limit` and use the returned `days` as the current page.
2. Use the returned `total` for page count and reset to page 1 when the date range changes.
3. Stop slicing all returned days in the browser.
4. Fetch complete range summary cards from the existing `GET /api/v1/reports/sales/summary?from=&to=&group_by=payment_method`; it already returns `total_sales`, `total_amount`, and `by_payment_method`, so changing the day page cannot change the range totals.

## 5. Compatibility and rollout

The backend accepts requests without `page`/`limit` using the default page and limit, preserving compatibility for existing clients. Backend commit `c760834` is merged; frontend can now consume the paginated shape. A running-instance smoke test remains useful for final verification.

## 6. Verification needed to unblock

- A running backend returns `200` with the exact paginated shape for page 1 and a later page.
- `total` remains stable across pages and matches the number of daily rows for the range.
- Empty ranges return `200` with `days: []` and `total: 0`.
- Invalid page/limit returns `400`.
- Non-Admin access remains `403`.
