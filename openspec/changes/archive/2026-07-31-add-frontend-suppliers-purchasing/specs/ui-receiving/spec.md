## MODIFIED Requirements

### Requirement: Confirm reception with payment method
The frontend SHALL let an authorized user confirm the reception of a `PENDING` order through a dialog that requires choosing a payment method — efectivo, transferencia or cuenta corriente — and that states, before confirmation, that the reception will record their user, the current date and time, the quantities actually delivered, stock movements and the order closure. The dialog SHALL let the user review or enter the quantity actually delivered for each active order item. Confirmation SHALL call the backend reception contract with the chosen method and delivered quantities. The confirm button SHALL be disabled while the request is in flight and until a method is chosen. On success the frontend SHALL show a success toast and re-read the order rather than assuming the resulting state. Backend failures SHALL surface the `message` inline in the dialog, leaving the chosen method and quantities intact.

#### Scenario: Successful reception
- **WHEN** the user chooses a payment method, confirms delivered quantities and the backend accepts reception
- **THEN** the order is re-read as `RECEIVED`, showing the receiving user, timestamp and payment method, stock reflects the delivered quantities, and a success toast is shown

#### Scenario: Payment method is mandatory
- **WHEN** the dialog opens with no payment method chosen
- **THEN** the confirm action is disabled until one is chosen

#### Scenario: What gets recorded is stated up front
- **WHEN** the reception dialog is open
- **THEN** it states that the user, date and time, actual delivered quantities, stock movements and order closure will be recorded

#### Scenario: Reception fails
- **WHEN** the backend rejects reception because quantities or stock cannot be updated
- **THEN** the dialog stays open showing the backend `message`, the order is not shown as received, and the frontend does not report a stock update

#### Scenario: Already received
- **WHEN** the order was received by someone else since the page loaded and the backend responds `409`
- **THEN** the message is surfaced and the order is re-read to show its actual state
