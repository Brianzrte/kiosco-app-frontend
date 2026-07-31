## MODIFIED Requirements

### Requirement: Navigation shell has no horizontal overflow at desktop and tablet widths

The frontend SHALL render the navigation header without producing horizontal page overflow for any authenticated role at desktop or tablet viewport widths from 768px up. Every navigation section available to the authenticated user's **roles**, the role indicator, and the sign-out control SHALL remain directly present in the header and activatable without horizontal scrolling of the page or of the header itself, and without being deferred behind an additional menu or "more" control that a role's full item set would otherwise reach directly at a wider width. This requirement does not change which sections are visible per role (governed by "Role-gated navigation shell"), nor the drawer-based mobile navigation used below 768px.

#### Scenario: No overflow across supported widths
- **WHEN** an authenticated user views the header at 768×1024, 1024×768, 1280×720, 1366×768, or 1440×900
- **THEN** the document's scrollable width equals its visible width at every one of those widths

#### Scenario: Full item set stays directly reachable
- **WHEN** the header is rendered at any width from 768px up
- **THEN** every navigation section available to that role, the role indicator, and the sign-out control are present in the header and can be activated without horizontal scrolling and without opening an additional overflow menu

#### Scenario: Compact labels remain understandable
- **WHEN** the available header width requires a compact presentation of navigation or session controls
- **THEN** each control retains an accessible name and visible text or an equivalent directly visible icon treatment, with focus and hover states distinguishable from the active route

#### Scenario: Mobile drawer behavior is unchanged
- **WHEN** the viewport is narrower than 768px
- **THEN** the mobile navigation drawer's trigger, content, and opening/closing focus behavior remain exactly as before this requirement was added
