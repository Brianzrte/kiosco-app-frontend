## ADDED Requirements

### Requirement: Navigation shell has no horizontal overflow at desktop and tablet widths
The frontend SHALL render the navigation header without producing horizontal page overflow for any authenticated role at desktop or tablet viewport widths from 768px up. Every navigation section available to the authenticated user's role, the role indicator, and the sign-out control SHALL remain directly present in the header and activatable without horizontal scrolling of the page or of the header itself, and without being deferred behind an additional menu or "more" control that a role's full item set would otherwise reach directly at a wider width. This requirement does not change which sections are visible per role (governed by "Role-gated navigation shell"), nor the drawer-based mobile navigation used below 768px.

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
