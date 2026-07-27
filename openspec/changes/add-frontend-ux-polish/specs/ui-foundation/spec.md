# ui-foundation

## ADDED Requirements

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

## MODIFIED Requirements

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
