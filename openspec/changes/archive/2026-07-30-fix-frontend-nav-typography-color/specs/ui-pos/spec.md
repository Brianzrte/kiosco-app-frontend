## ADDED Requirements

### Requirement: Payment-method selector has method-specific visual feedback
The POS payment-method selector SHALL preserve its existing radio-button selection behavior while showing Efectivo, Tarjeta, and Transferencia with the selector's original secondary text and border treatment in their unselected resting state. When an unselected option is hovered, its full surface SHALL use a low-opacity version of the method-specific light accent and its outer border SHALL use the full-strength accent while text and icon retain the secondary treatment. When selected, an option SHALL use that method's light accent for its background and border, with black icon and text. The keyboard focus indicator SHALL remain visually distinct from hover and selected states, and text and icon SHALL continue to identify the payment method without color alone.

#### Scenario: Resting payment options identify their method
- **WHEN** the POS shows the three payment options before one is selected
- **THEN** each option displays its original secondary text and border treatment alongside its visible label and icon

#### Scenario: Hover mirrors the summary-card accent format
- **WHEN** a pointer hovers an unselected payment option
- **THEN** its full surface uses a soft version of the corresponding accent and the option border uses the full-strength accent without changing the radio selection

#### Scenario: Keyboard focus remains distinct
- **WHEN** a payment option receives keyboard focus
- **THEN** its visible focus indicator remains present and distinguishable from both hover and selected states

#### Scenario: Selected option inverts to its pastel treatment
- **WHEN** the cashier selects a payment option
- **THEN** that option displays its method-specific light accent as background and border while its text and icon remain black

#### Scenario: Payment method is understandable without color
- **WHEN** payment-option colors are unavailable or viewed in grayscale
- **THEN** the visible text label and icon continue to identify Efectivo, Tarjeta, and Transferencia
