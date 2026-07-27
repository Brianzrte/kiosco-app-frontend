# ui-inventory

## Purpose

Vista de stock, inicialización y ajuste manual con motivo obligatorio.

Fuente: `CLAUDE.md` (spec de frontend y design system) y los specs de backend en `../backend/docs/specs/`.

## Requirements

### Requirement: Stock view per product
The frontend SHALL show current stock for a product from `GET /api/v1/inventory/stock/{product_id}`, displaying quantity, minimum quantity, and last update. Quantities at or below the minimum SHALL be highlighted with the Warning color.

#### Scenario: Stock displayed
- **WHEN** the inventory screen loads a product's stock
- **THEN** quantity, minimum quantity, and updated-at are shown

#### Scenario: Low stock highlighted
- **WHEN** a product's quantity is at or below its minimum quantity
- **THEN** the quantity is highlighted with the Warning color

### Requirement: Initialize stock
The frontend SHALL allow initializing stock for a product without stock via `POST /api/v1/inventory/stock` with `{ product_id, quantity, reason }`, where quantity SHALL be ≥ 0.

#### Scenario: Stock initialized
- **WHEN** a valid initialization is submitted
- **THEN** the stock record is created and the view shows the new quantity

### Requirement: Manual stock adjustment requires a reason
The frontend SHALL provide an adjustment form sending `{ quantity_delta, reason }` to `POST /api/v1/inventory/stock/{product_id}/adjust`. The form SHALL NOT submit with an empty reason, and positive/negative deltas SHALL be clearly distinguished (entrada/salida).

#### Scenario: Adjustment without reason blocked
- **WHEN** the user tries to submit an adjustment with an empty reason
- **THEN** submission is blocked and the reason field shows a required-field message

#### Scenario: Successful adjustment
- **WHEN** a delta with a reason is submitted and accepted
- **THEN** the displayed quantity updates and a success toast appears

#### Scenario: Backend rejects adjustment
- **WHEN** the backend rejects the adjustment (e.g. would go below zero)
- **THEN** the backend message is shown and the form values are preserved
