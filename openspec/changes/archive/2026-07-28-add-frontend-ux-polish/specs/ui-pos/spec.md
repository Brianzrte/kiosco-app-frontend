# ui-pos

## ADDED Requirements

### Requirement: Cart feedback on scan
When an item is added to the cart or an existing line's quantity is incremented, the affected line SHALL be highlighted in place for `--motion-base` and the running total SHALL be visually acknowledged. The line SHALL NOT slide, enter from offscreen, or otherwise displace surrounding rows, and the total SHALL NOT animate as a progressive numeric count. The feedback SHALL NOT alter scan focus behaviour or delay readiness for the next scan.

#### Scenario: Added line is acknowledged in place
- **WHEN** a scanned product is added to the cart
- **THEN** its row is briefly highlighted without moving, and no other row shifts position

#### Scenario: Rapid consecutive scans stay legible
- **WHEN** several barcodes are scanned in rapid succession
- **THEN** each addition is acknowledged without rows displacing each other, and the list remains readable throughout

#### Scenario: Feedback does not gate the next scan
- **WHEN** the highlight animation is still running
- **THEN** the scan input already holds focus and accepts the next barcode

#### Scenario: Colour is not the only confirmation
- **WHEN** a repeated scan increments an existing line
- **THEN** the displayed quantity changes value, independently of the highlight

#### Scenario: Reduced motion
- **WHEN** the user has `prefers-reduced-motion: reduce` set
- **THEN** the line still receives a brief colour acknowledgement and nothing translates or scales
