# ui-sales

## MODIFIED Requirements

### Requirement: Cashier sees only their own sales, defaulting to today
The frontend SHALL offer the sales list to a user whose access to it comes from role `cashier` and not from role `admin`, restricted to that cashier's own sales, including their own drafts, and restricted to the **current day**. The ownership restriction SHALL be enforced by the backend scoping the response to the authenticated user; the frontend SHALL NOT request an unrestricted list and filter it client-side under any circumstance. For a cashier the cashier filter SHALL be omitted entirely rather than rendered disabled, and the date range control SHALL be omitted as well: the day is fixed to today and displayed as a static label, so the screen never offers a range the backend will silently clip. A user holding both `cashier` and `admin` SHALL get the Admin view, with the full range and the cashier filter.

#### Scenario: Cashier sees their own sales
- **WHEN** a cashier opens the sales section
- **THEN** only sales they registered are listed, including their own drafts

#### Scenario: Cashier's list is fixed to today
- **WHEN** a cashier opens the sales section
- **THEN** the current day is shown as a static label and no date range control is rendered

#### Scenario: Scope is never enforced in the client
- **WHEN** the cashier-facing list is requested
- **THEN** the frontend does not receive other cashiers' sales and performs no client-side ownership filtering

#### Scenario: Cashier filter is absent, not disabled
- **WHEN** a cashier views the list
- **THEN** no cashier filter control is rendered

#### Scenario: Cashier finds their unfinished sale
- **WHEN** a cashier filters their list by draft status
- **THEN** their own unconfirmed sales from today are listed, newest first

#### Scenario: Day rolls over during a shift
- **WHEN** the cashier reloads the list after midnight
- **THEN** the label shows the new day and the previous day's sales are no longer listed

#### Scenario: Admin who is also a cashier
- **WHEN** a user holding `admin` and `cashier` opens the sales section
- **THEN** the Admin view is rendered, with the adjustable date range and the cashier filter
