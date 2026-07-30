## MODIFIED Requirements

### Requirement: Reports dashboard layout
`/reports` SHALL present a compact dashboard rather than a stack of full-length report sections. It SHALL contain, in this order: the date-range selector, the range summary tiles, a daily revenue chart rendered at reduced height alongside its period comparison, a card listing the top 3 selling products, a card listing the top-selling categories, and the navigation cards to the detail reports. The whole dashboard SHALL be reachable without horizontal scrolling on mobile widths.

#### Scenario: Dashboard on load
- **WHEN** an Admin opens `/reports`
- **THEN** the summary, the compact daily chart with its comparison, the top-3 products card, the top-selling categories card, and the report navigation cards are all present on one screen

#### Scenario: Detail reports are not inlined
- **WHEN** the dashboard renders
- **THEN** no per-cashier breakdown, per-product breakdown, or full sales listing appears on it — those live in their own pages

## ADDED Requirements

### Requirement: Top selling categories card
The dashboard SHALL show a card listing the product categories with sales in the selected range, ordered by descending revenue, each row showing the category name, its revenue, and the quantity of units sold. It SHALL be sourced from a backend aggregation by category; the frontend SHALL NOT derive category totals by summing individual products itself.

#### Scenario: Categories listed by revenue
- **WHEN** the selected range contains sales across more than one category
- **THEN** categories are listed in descending revenue order, each with its revenue and units sold

#### Scenario: No sales in range
- **WHEN** the selected range contains no sales in any category
- **THEN** the card shows an empty state instead of an empty list

#### Scenario: A category with no sales in the range
- **WHEN** a category has no sales in the selected range
- **THEN** it does not appear in the ranking

#### Scenario: Request fails
- **WHEN** the category aggregation request fails
- **THEN** the card shows an error state with a retry action, matching the pattern used by the top selling products card

### Requirement: Navigation card to the profitability report
The dashboard's navigation cards SHALL include a card for the profitability report (`/reports/profitability`), alongside the existing detail report cards.

#### Scenario: Profitability card opens its page
- **WHEN** an Admin activates the profitability navigation card, by pointer or by keyboard
- **THEN** `/reports/profitability` opens
