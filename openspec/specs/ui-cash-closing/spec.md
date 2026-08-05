# ui-cash-closing

## Purpose

Resumen diario de ventas y herramienta de cierre de caja por rango de fechas, restringidos a rol `admin`.

Implementado en `src/components/sales/SalesView.tsx` (`DailySummaryCards`, `CashClosingTool`), consumiendo `GET /reports/sales/summary?group_by=payment_method` desde que el backend lo desplegó.
## Requirements
### Requirement: Daily sales summary cards

The frontend SHALL show, on the operational sales screen (`/sales`), summary cards for the current day: count of confirmed sales, total revenue, total paid in cash, total paid by card, and total paid by transfer. The figures SHALL come from a backend aggregation endpoint; the frontend SHALL NOT compute them by summing a paginated list of individual sales client-side. This requirement is restricted to role `admin`, matching the rest of `/sales`. While `/sales` stays mounted and visible, the cards SHALL re-fetch the aggregation endpoint on a fixed interval so a sale or return registered elsewhere (including from another device) becomes reflected without the Admin navigating away or reloading; a background refresh that fails SHALL be ignored, keeping the last successfully loaded figures on screen, rather than replacing them with the error state used for the initial load.

#### Scenario: Admin sees today's summary
- **WHEN** an Admin opens `/sales`
- **THEN** cards show today's confirmed sale count, total revenue, total cash, total card, and total transfer, sourced from the backend aggregation endpoint

#### Scenario: No confirmed sales today
- **WHEN** there are zero confirmed sales for the current day
- **THEN** the cards show zero values, not an error or an empty-state replacing the whole screen

#### Scenario: No sales by transfer in range
- **WHEN** there are confirmed sales for the current day but none paid by transfer
- **THEN** the transfer card shows zero, not a missing card or an error

#### Scenario: Aggregation is never computed client-side
- **WHEN** the summary cards are requested
- **THEN** the frontend issues a single request to the backend's aggregation endpoint and renders its totals directly, without fetching individual sales to sum them

#### Scenario: Cards pick up a change registered elsewhere without navigating
- **WHEN** `/sales` stays open and another sale or a return affecting today's totals is registered by someone else from another device
- **THEN** within one refresh interval the cards' figures update to reflect the current aggregation response, without the Admin reloading or navigating away

#### Scenario: Background refresh failure keeps the last good figures
- **WHEN** a periodic refresh of the aggregation endpoint fails while the cards already show data from a previous successful load
- **THEN** the cards keep showing the previously loaded figures, no error replaces them, and the next interval tick retries

### Requirement: Cash closing tool
The frontend SHALL provide a cash-closing view that shows the same breakdown as the summary cards (confirmed sale count, total revenue, total cash, total card, total transfer) over an operator-selected date range, defaulting to the current day. It SHALL be reachable from `/sales` and restricted to role `admin`.

#### Scenario: Admin closes the day's register
- **WHEN** an Admin opens the cash-closing tool with the default range
- **THEN** it shows today's totals broken down by payment method, including transfer

#### Scenario: Admin selects a different range
- **WHEN** an Admin changes the date range
- **THEN** the breakdown updates to match the newly selected range, sourced from the same backend aggregation endpoint

#### Scenario: Tool never blocks selling
- **WHEN** the cash-closing tool is open or in use
- **THEN** it has no effect on the POS or on any cashier's ability to register sales — there is no "close the register" action that locks anything, because no such concept exists in the backend domain
