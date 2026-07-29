# ui-foundation

## Purpose

App shell, tokens del design system, UI kit compartido, navegación y layout con gating por rol.

Fuente: `CLAUDE.md` (spec de frontend y design system) y los specs de backend en `../backend/docs/specs/`.
## Requirements
### Requirement: Design system tokens
The frontend SHALL define all colors, radii, shadows, and motion durations as design tokens matching the palette in `CLAUDE.md`, and every screen SHALL consume only those tokens. Pastel colors SHALL be used only for categories, badges, cards, and decorative elements — never for primary buttons. Border radius SHALL be 12px and the theme SHALL be light-only.

#### Scenario: Screen uses only design-system colors
- **WHEN** any screen is rendered
- **THEN** every color used resolves to a token from the design system palette

#### Scenario: Pastel misuse is not possible via the UI kit
- **WHEN** a developer composes a primary action button from the UI kit
- **THEN** the button renders in Primary (`#9C566C`) and the kit exposes no pastel variant for primary actions

#### Scenario: Motion durations come from tokens
- **WHEN** any transition or animation is declared
- **THEN** its duration and easing resolve to motion tokens, not to literal values

### Requirement: Shared UI kit
The frontend SHALL provide a shared set of primitives (Button, Input, Card, Badge, Table, Dialog, Toast) built on the design tokens, and screens SHALL compose these primitives instead of ad-hoc styled elements.

#### Scenario: Form screen composes kit primitives
- **WHEN** the product creation form is rendered
- **THEN** its inputs, buttons, and feedback messages are instances of the shared UI kit components

### Requirement: Role-gated navigation shell
The frontend SHALL render a navigation shell that shows only the sections permitted for the authenticated user's **roles**, where a user holds one or more roles and the visible sections are the **union** of what each role permits. Gating SHALL be evaluated as an intersection between the session's roles and the roles a section or route declares, never as equality against a single role. Sections by role: Cashier — POS and their own sales; Inventory Manager — products, stock, movements; Receiving — stock loading and the receiving section, without catalog write access; Admin — everything, including categories, users and reports. Role gating remains UX only; the backend enforces.

#### Scenario: Cashier sees only sales navigation
- **WHEN** a user whose only role is `cashier` is authenticated
- **THEN** the navigation shows the POS section and does not show products, inventory, receiving, categories, or reports

#### Scenario: Direct navigation to a forbidden route
- **WHEN** a cashier navigates directly to `/products` by URL
- **THEN** the frontend redirects them away from the page and no product data is requested

#### Scenario: Inventory Manager has no sales section
- **WHEN** a user whose only role is `inventory` is authenticated
- **THEN** the navigation does not show the sales section, and navigating to it directly redirects them away without requesting sales data

#### Scenario: Users section is Admin-only
- **WHEN** a user whose only role is `inventory` is authenticated
- **THEN** the navigation does not show the users section, and navigating to it directly redirects them away without requesting user data

#### Scenario: Union of two roles
- **WHEN** a user holds `cashier` and `receiving`
- **THEN** the navigation shows the POS section, their sales, the receiving section and stock loading, and still does not show categories, users or reports

#### Scenario: Receiving role has no catalog access
- **WHEN** a user whose only role is `receiving` navigates directly to `/products`
- **THEN** they are redirected away and no product data is requested

#### Scenario: Landing screen for a multi-role user
- **WHEN** a user with several roles logs in
- **THEN** they land on the home screen of the highest-priority role they hold, in the fixed order admin, cashier, receiving, inventory

### Requirement: Explicit loading, empty, and error states
Every data-driven screen SHALL render explicit loading, empty, and error states. Empty states SHALL invite the primary action; error states SHALL state what happened and SHALL offer an explicit recovery action appropriate to the failure (retry, sign in again, or go back). An error state SHALL NOT be shown as a transient toast.

#### Scenario: Empty product list
- **WHEN** the product list loads successfully with zero products
- **THEN** the screen shows an empty state with a call to action to create the first product

#### Scenario: Backend error on load
- **WHEN** a list request fails with an error response
- **THEN** the screen shows the backend error message and a retry control

#### Scenario: Every error state offers a way forward
- **WHEN** any error state is rendered
- **THEN** it presents at least one recovery control, and that control is reachable by keyboard

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

### Requirement: Transport error vocabulary
When a request fails without a parseable backend `{ message }` — network rejection, timeout, `5xx` with no JSON body, or unparseable response — the frontend SHALL show a fixed Spanish message describing what happened and SHALL NOT surface raw exception text. When the backend does provide a `message`, that message SHALL be shown verbatim and SHALL take precedence over any frontend-supplied text. The frontend SHALL NOT rephrase, translate, or substitute backend messages.

#### Scenario: Network unreachable
- **WHEN** a request rejects because the server cannot be reached
- **THEN** the error state reads "No se pudo conectar con el servidor. Revisá tu conexión." and offers a retry control

#### Scenario: Backend message wins over transport classification
- **WHEN** the backend responds `500` with a body containing `{ "message": "..." }`
- **THEN** the backend message is shown verbatim, not the generic server-failure text

#### Scenario: Raw exception text never reaches the user
- **WHEN** a request fails with a `TypeError` from `fetch`
- **THEN** no exception name, stack trace, or English runtime text appears anywhere in the UI

#### Scenario: Forbidden is distinct from unauthenticated
- **WHEN** a request fails with `403`
- **THEN** the user is told they lack permission and is offered a way back, and the session is NOT cleared and no redirect to `/login` occurs

### Requirement: Deferred loading feedback
Every user-initiated action that awaits a response SHALL show a visible in-progress indicator on the control that triggered it, appearing only after a 400 ms threshold so fast responses do not flicker. Initial loads of lists SHALL use a skeleton that preserves the final layout. The frontend SHALL NOT render a full-page blocking overlay for a partial operation, and SHALL NOT retry failed requests automatically.

#### Scenario: Fast response does not flicker
- **WHEN** an action completes in less than 400 ms
- **THEN** no spinner is ever displayed

#### Scenario: Slow action shows progress in place
- **WHEN** an action takes longer than 400 ms
- **THEN** a spinner appears inside the triggering control, the control stays disabled, and the rest of the page remains usable

#### Scenario: Sale confirmation shows progress immediately
- **WHEN** the cashier confirms a sale
- **THEN** the in-progress state appears immediately with no threshold delay

#### Scenario: No silent retry
- **WHEN** a write request fails
- **THEN** the frontend does not reissue it automatically and waits for an explicit user action

### Requirement: Motion system
The frontend SHALL express all animation through motion tokens (`--motion-fast` 120 ms, `--motion-base` 200 ms, `--motion-slow` 320 ms and two easing curves); no ad-hoc durations. Only GPU-composited properties (`opacity`, `transform`) SHALL be animated. Navigating between sections SHALL animate the entering view only, never delaying it behind an exit animation.

#### Scenario: Section transition
- **WHEN** the user navigates from one section to another
- **THEN** the entering view fades in with a 4px upward shift over `--motion-base`, and no exit animation delays it

#### Scenario: No layout-thrashing animation
- **WHEN** any animation runs
- **THEN** it animates only `opacity` and/or `transform`

#### Scenario: Reduced motion preserves the signal
- **WHEN** the user has `prefers-reduced-motion: reduce` set
- **THEN** translation and scale are removed, and feedback that conveyed information through movement is conveyed instead by a 120 ms color change with no displacement

