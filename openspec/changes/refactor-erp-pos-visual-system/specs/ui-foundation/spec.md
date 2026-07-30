## MODIFIED Requirements

### Requirement: Design system tokens

The frontend SHALL define all colors, radii, shadows, typography steps, layout
spacing and motion durations as design tokens, and every screen SHALL consume
only those tokens. The light-only visual system SHALL use luminous neutral
surfaces, subtle borders and low-elevation shadows; pastel colors SHALL be used
only for categories, KPI grouping and decorative surfaces — never for primary
buttons, charts or as the sole indication of state. Border radius SHALL remain
12px.

#### Scenario: Workspace surface remains legible
- **WHEN** an authenticated workspace is rendered
- **THEN** its background, panels, borders, text and elevation resolve to design
  tokens and the primary action remains visually distinct from pastel grouping
  surfaces

#### Scenario: Data meaning is not conveyed only by colour
- **WHEN** a badge, KPI, stock state or navigation item uses colour
- **THEN** it also exposes a text label, icon, value or accessible state that
  communicates the same meaning

### Requirement: Role-gated navigation shell

The frontend SHALL render role-gated navigation as a persistent workspace rail
at desktop widths and as the existing mobile navigation pattern below tablet
widths. It SHALL show only the sections permitted for the authenticated user's
roles, where a user holds one or more roles and visible sections are their
union. The active section SHALL be identifiable by label, icon, accessible
current-page semantics and visual treatment; navigation condensation SHALL not
hide an authorized section behind horizontal scrolling or an additional menu at
tablet/desktop widths.

#### Scenario: Desktop workspace orientation
- **WHEN** an authenticated user views the application at desktop width
- **THEN** the rail presents the product identity, authorized sections, active
  section and session controls while the active route is rendered in a separate
  workspace area

#### Scenario: Condensed navigation remains accessible
- **WHEN** a tablet-width rail presents an icon without its visible label
- **THEN** the link retains an accessible name and the authorized route remains
  directly activatable without horizontal scrolling

#### Scenario: Mobile navigation preserves task space
- **WHEN** the viewport is narrower than 768px
- **THEN** the existing drawer or bottom navigation remains keyboard-operable
  and the page content does not reserve desktop-rail width

### Requirement: Shared UI kit

The frontend SHALL provide shared primitives for buttons, inputs, cards,
badges, tables, dialogs, toasts, page headers, summary metrics and explicit
states, all built on the design tokens. Administrative views SHALL compose a
consistent sequence of contextual header, primary action, optional operational
summary, filters and dominant data region; screens SHALL not reproduce that
visual treatment with ad-hoc styling.

#### Scenario: Administrative listing has an observable hierarchy
- **WHEN** an authorized user opens a data-driven administrative list
- **THEN** the screen presents its title/context and primary action before its
  filters and dominant list or table, without displacing the data with
  decorative content

#### Scenario: Loading preserves the target hierarchy
- **WHEN** an administrative list is loading
- **THEN** its skeleton preserves the approximate header, summary, filters and
  data-region geometry so the screen does not substantially reflow on success

### Requirement: Accessibility floor

The frontend SHALL be responsive down to mobile widths, SHALL show visible
keyboard focus on all interactive elements, SHALL respect
`prefers-reduced-motion`, and SHALL allow text and controls to reflow without
clipping essential information. Icon-only controls and condensed navigation
items SHALL expose accessible names.

#### Scenario: Reflow preserves the primary task
- **WHEN** a user views a screen at mobile width or with enlarged text
- **THEN** the primary action, essential status and recovery controls remain
  reachable without relying on horizontal page scrolling
