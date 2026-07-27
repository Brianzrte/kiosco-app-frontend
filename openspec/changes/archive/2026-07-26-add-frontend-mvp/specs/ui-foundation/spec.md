# ui-foundation

## ADDED Requirements

### Requirement: Design system tokens
The frontend SHALL define all colors, radii, and shadows as design tokens matching the palette in `CLAUDE.md`, and every screen SHALL consume only those tokens. Pastel colors SHALL be used only for categories, badges, cards, and decorative elements — never for primary buttons. Border radius SHALL be 12px and the theme SHALL be light-only.

#### Scenario: Screen uses only design-system colors
- **WHEN** any screen is rendered
- **THEN** every color used resolves to a token from the design system palette

#### Scenario: Pastel misuse is not possible via the UI kit
- **WHEN** a developer composes a primary action button from the UI kit
- **THEN** the button renders in Primary (#2563EB) and the kit exposes no pastel variant for primary actions

### Requirement: Shared UI kit
The frontend SHALL provide a shared set of primitives (Button, Input, Card, Badge, Table, Dialog, Toast) built on the design tokens, and screens SHALL compose these primitives instead of ad-hoc styled elements.

#### Scenario: Form screen composes kit primitives
- **WHEN** the product creation form is rendered
- **THEN** its inputs, buttons, and feedback messages are instances of the shared UI kit components

### Requirement: Role-gated navigation shell
The frontend SHALL render a navigation shell that shows only the sections permitted for the authenticated user's role (Cashier: POS and sales; Inventory Manager: products, stock, movements; Admin: everything including categories).

#### Scenario: Cashier sees only sales navigation
- **WHEN** a user with role `cashier` is authenticated
- **THEN** the navigation shows the POS section and does not show products, inventory, categories, or reports

#### Scenario: Direct navigation to a forbidden route
- **WHEN** a cashier navigates directly to `/products` by URL
- **THEN** the frontend redirects them away from the page and no product data is requested

### Requirement: Explicit loading, empty, and error states
Every data-driven screen SHALL render explicit loading, empty, and error states. Empty states SHALL invite the primary action; error states SHALL show the backend `message` and how to retry.

#### Scenario: Empty product list
- **WHEN** the product list loads successfully with zero products
- **THEN** the screen shows an empty state with a call to action to create the first product

#### Scenario: Backend error on load
- **WHEN** a list request fails with an error response
- **THEN** the screen shows the backend error message and a retry control

### Requirement: Accessibility floor
The frontend SHALL be responsive down to mobile widths, SHALL show visible keyboard focus on all interactive elements, and SHALL respect `prefers-reduced-motion`.

#### Scenario: Keyboard navigation
- **WHEN** a user tabs through any screen
- **THEN** each interactive element shows a visible focus indicator

### Requirement: Spanish user-facing copy
All user-facing text SHALL be in Spanish with sentence case and active voice; code identifiers SHALL remain in English. Action names SHALL stay consistent through a flow (e.g. button "Confirmar venta" → toast "Venta confirmada").

#### Scenario: Consistent action naming
- **WHEN** a user confirms a sale from the button labeled "Confirmar venta"
- **THEN** the success feedback reads "Venta confirmada"
