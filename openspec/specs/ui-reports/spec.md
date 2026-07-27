# ui-reports

## Purpose

Resumen de ventas, top de productos e historial de movimientos de stock.

Fuente: `CLAUDE.md` (spec de frontend y design system) y los specs de backend en `../backend/docs/specs/`.

## Requirements

### Requirement: Sales summary by date range
The frontend SHALL show a sales summary from `GET /api/v1/reports/sales/summary` with a date-range selector, presenting totals in a read-only view. Report views SHALL never expose write actions.

#### Scenario: Summary for a range
- **WHEN** the user selects a date range
- **THEN** the summary for that range is fetched and displayed

#### Scenario: Empty range
- **WHEN** the selected range has no sales
- **THEN** an empty state explains there are no sales in the period

### Requirement: Top products
The frontend SHALL display top-selling products from `GET /api/v1/reports/products/top` as a ranked, read-only list.

#### Scenario: Top products listed
- **WHEN** the top products view loads
- **THEN** products are listed in descending sales order

### Requirement: Stock movement history
The frontend SHALL display stock movement history from `GET /api/v1/reports/stock/history`, filterable by product, showing movement type, quantity delta, reason, and timestamp for each entry.

#### Scenario: History for a product
- **WHEN** the user filters history by a product
- **THEN** that product's movements are listed with type, delta, reason, and timestamp

### Requirement: Reports are Admin-only in MVP
Access to `/reports` SHALL be limited to the Admin role until the Business Owner role exists.

#### Scenario: Non-admin blocked
- **WHEN** a Cashier or Inventory Manager navigates to `/reports`
- **THEN** access is denied by the role gate
