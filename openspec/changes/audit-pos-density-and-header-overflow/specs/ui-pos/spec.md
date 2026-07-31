## ADDED Requirements

### Requirement: POS entry region uses compact operational density

The POS SHALL keep the barcode scan input as the dominant entry control while using an operational height between 44px and 52px and a text size of at least 16px. At desktop widths where the content fits, the scan input and manual product search SHALL share an entry row with the scan input receiving the larger share of available space; at narrower widths they SHALL remain stacked.

#### Scenario: Desktop entry row preserves scan priority
- **WHEN** an authenticated cashier or admin opens the POS at 1280×720 or 1366×768
- **THEN** the scan input and manual search are visible without horizontal overflow, the scan input is visually dominant, and the scan input remains focusable on load

#### Scenario: Narrow entry region remains usable
- **WHEN** the POS is viewed below the breakpoint where both fields fit comfortably
- **THEN** the fields are stacked, each remains full-width and usable, and the scan input keeps a visible focus indicator

#### Scenario: Compact scan input remains operational
- **WHEN** a cashier types or scans into the compact scan input
- **THEN** the input uses at least 16px text, has an interactive height of at least 44px, accepts the barcode Enter flow, and returns focus after the existing scan outcomes

### Requirement: Cart rows remain scannable at desktop density

The POS SHALL present unit-based cart rows in a stable desktop composition with the product, quantity control, effective subtotal, and remove action aligned without accidental wrapping. The quantity controls and remove action SHALL retain an interactive area of at least 44×44px, and the product name SHALL be allowed to shrink or truncate without causing document overflow.

#### Scenario: Three unit-based lines fit at notebook width
- **WHEN** the cart contains three unit-based products at 1366×768
- **THEN** the three rows remain visible as stable rows, each row keeps quantity, subtotal, and remove reachable, and no row wraps because of the desktop layout

#### Scenario: Long product name does not overflow the page
- **WHEN** a cart line has a long product name or SKU-like text
- **THEN** the product region truncates or wraps within its column and the document has no horizontal overflow

#### Scenario: Mobile cart remains operable
- **WHEN** the POS is viewed at 320×568 or 844×390
- **THEN** cart controls remain reachable without horizontal page scrolling, quantity and subtotal remain understandable, and the existing fixed total/confirm action remains available when the cart has content
