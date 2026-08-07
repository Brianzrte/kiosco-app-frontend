## MODIFIED Requirements

### Requirement: Shift closing modal shows backend-computed expected cash
Opening the "Cerrar caja" action SHALL open a modal for the authenticated
operator's active shift. The frontend SHALL submit no client-selected start
boundary and SHALL show the backend-derived interval and expected cash after a
successful closing; it SHALL NOT compute this total from individual sales. When
the backend reports cash expenses within the closing's scope, the modal SHALL
show their total as a separate line of the breakdown, stating that it is already
deducted from expected cash. The frontend SHALL NOT perform that deduction
itself, and SHALL NOT infer the line from any source other than the backend
response.

#### Scenario: Modal loads expected cash
- **WHEN** the operator opens the "Cerrar caja" modal
- **THEN** it loads their backend-scoped reconciliation state and uses the
  backend closing response for expected cash

#### Scenario: No confirmed cash sales in the shift
- **WHEN** the operator has an active shift with zero confirmed cash sales
- **THEN** the backend-derived expected cash includes only its confirmed
  opening fund and the modal does not show an error

#### Scenario: Cash expenses are explained in the breakdown
- **WHEN** the backend reports one or more cash expenses within the closing's scope
- **THEN** the modal shows their total as its own labelled line, states that it is already deducted from expected cash, and does not recompute expected cash

#### Scenario: No cash expenses in the shift
- **WHEN** the backend reports no cash expense within the closing's scope
- **THEN** no expense line is shown and the breakdown is unchanged from its previous form
