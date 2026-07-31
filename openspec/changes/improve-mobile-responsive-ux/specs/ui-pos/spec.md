## MODIFIED Requirements

### Requirement: Cart editing
The cart SHALL allow changing a line's quantity and removing a line before confirmation. The running total SHALL be computed with decimal-safe arithmetic (never floating point on price strings) and displayed at all times.

Below the `md` breakpoint, while the cart has at least one line, the running total and the "Confirmar venta" action SHALL be presented in a bar fixed to the bottom of the viewport, reachable without scrolling the cart contents, in both portrait and short-landscape orientations. This bar SHALL be the only place the total and the confirm action appear at that width — it replaces their position in normal document flow rather than duplicating it. From `md` up, the existing two-column layout SHALL remain unchanged, since the total and confirm action are already reachable without scrolling at that width.

Each quantity-adjustment control (increment and decrement) in the cart SHALL have a touch target of at least 44px on its shorter side below the `md` breakpoint, matching the touch-target floor already used elsewhere in the shared UI kit for frequent point-of-sale actions; a smaller footprint MAY apply only from `md` up, where pointer input is expected instead of touch.

#### Scenario: Remove a line
- **WHEN** the cashier removes a cart line
- **THEN** the line disappears and the total updates

#### Scenario: Decimal-safe total
- **WHEN** the cart contains items with prices like "12.50"
- **THEN** the displayed total is exact to two decimals with no floating-point drift

#### Scenario: Total and confirm action stay reachable without scrolling on mobile
- **WHEN** the cart has at least one line and the viewport is below the `md` breakpoint, in portrait or in short landscape
- **THEN** the total and "Confirmar venta" are visible in a bar fixed to the bottom of the viewport without scrolling the cart

#### Scenario: Fixed bar does not duplicate the total
- **WHEN** the mobile fixed action bar is visible
- **THEN** the total and the confirm action are not additionally rendered in their previous in-flow position

#### Scenario: Tablet and desktop layout is unchanged
- **WHEN** the viewport is at or above the `md` breakpoint
- **THEN** the total and "Confirmar venta" keep their existing two-column position, with no fixed bottom bar introduced

#### Scenario: Quantity steppers meet the touch-target floor on mobile
- **WHEN** the cart is viewed below the `md` breakpoint
- **THEN** each quantity increment and decrement control measures at least 44px on its shorter side
