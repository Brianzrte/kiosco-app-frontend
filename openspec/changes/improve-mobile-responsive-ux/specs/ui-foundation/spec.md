## MODIFIED Requirements

### Requirement: Shared UI kit
The frontend SHALL provide a shared set of primitives (Button, Input, Card, Badge, Table, Dialog, Toast, a collapsible filter/search group) built on the design tokens, and screens SHALL compose these primitives instead of ad-hoc styled elements. The collapsible filter/search group SHALL expose a trigger with `aria-expanded`, keyboard support to expand and collapse (including `Escape` to collapse and return focus to the trigger), and, when collapsed with at least one filter applied, a visible count of active filters that does not rely on colour alone.

#### Scenario: Form screen composes kit primitives
- **WHEN** the product creation form is rendered
- **THEN** its inputs, buttons, and feedback messages are instances of the shared UI kit components

#### Scenario: Collapsible filter group is keyboard operable
- **WHEN** a keyboard user reaches a collapsible filter group's trigger and activates it
- **THEN** the secondary filters expand, `aria-expanded` reflects the new state, and `Escape` collapses the group again and returns focus to the trigger

#### Scenario: Active filters remain visible while collapsed
- **WHEN** at least one filter inside a collapsed group is applied
- **THEN** the trigger shows a text-visible count of active filters, not a colour-only indicator

### Requirement: Navigation shell has no horizontal overflow at desktop and tablet widths
The frontend SHALL render the navigation header without producing horizontal page overflow for any authenticated role at desktop or tablet viewport widths from 768px up. Every navigation section available to the authenticated user's role, the role indicator, and the sign-out control SHALL remain directly present in the header and activatable without horizontal scrolling of the page or of the header itself, and without being deferred behind an additional menu or "more" control that a role's full item set would otherwise reach directly at a wider width. This requirement does not change which sections are visible per role (governed by "Role-gated navigation shell"), nor the drawer-based mobile navigation used below 768px.

Each navigation section's text label, the role indicator's text, and the sign-out control's text label SHALL become visible starting at the narrowest breakpoint from `lg` (1024px) up where the full item set for the widest role (Admin) fits without producing the horizontal overflow this requirement already forbids. The frontend SHALL NOT defer visible text labels to `2xl` (1536px) when a narrower breakpoint already satisfies that condition. If no single breakpoint between `lg` and `2xl` fits the full label set without overflow, lower-priority sections SHALL progressively collapse to their icon-only presentation (keeping their accessible name) before the whole set is deferred to a wider breakpoint than necessary.

#### Scenario: No overflow across supported widths
- **WHEN** an authenticated user views the header at 768×1024, 1024×768, 1280×800, 1366×768, or 1440×900
- **THEN** the document's scrollable width equals its visible width at every one of those widths

#### Scenario: Full item set stays directly reachable
- **WHEN** the header is rendered at any width from 768px up
- **THEN** every navigation section available to that role, the role indicator, and the sign-out control are present in the header and can be activated without horizontal scrolling and without opening an additional overflow menu

#### Scenario: Icon-only presentation keeps an accessible name
- **WHEN** a navigation section's label is not shown as visible text at a given width
- **THEN** that section's link, and the sign-out control if likewise affected, still exposes its label as an accessible name reachable by assistive technology

#### Scenario: Mobile drawer behavior is unchanged
- **WHEN** the viewport is narrower than 768px
- **THEN** the mobile navigation drawer's trigger, content, and opening/closing focus behavior remain exactly as before this requirement was added

#### Scenario: Text labels appear as early as they fit
- **WHEN** the Admin role's full navigation item set, logo, role badge and sign-out control fit without horizontal overflow at 1024px
- **THEN** text labels are visible starting at 1024px, not deferred to 1536px

#### Scenario: Progressive collapse when no fixed breakpoint fits everything
- **WHEN** the full label set does not fit without overflow at any single breakpoint between 1024px and 1536px
- **THEN** the frontend collapses lower-priority sections to icon-only first, rather than hiding every label until 1536px
