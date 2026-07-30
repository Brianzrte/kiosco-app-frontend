## ADDED Requirements

### Requirement: Inventory workspace hierarchy

The inventory screen SHALL use the shared administrative workspace hierarchy
and shall make stock quantity, minimum, update time and labelled operational
state scannable before secondary movement detail. Low, zero and uninitialised
states SHALL remain distinguishable by text in addition to the refactored
visual treatment.

#### Scenario: Operator scans actionable stock state
- **WHEN** an authorized user opens inventory
- **THEN** they can distinguish a product below minimum, at zero and not
  initialised without relying only on colour and can reach the existing stock
  action from the workspace header or row
