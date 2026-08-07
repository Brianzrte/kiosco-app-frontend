## ADDED Requirements

### Requirement: Expenses section uses contextual actions and communicates navigation progress
The frontend SHALL keep Egresos as one Admin-only entry in the primary navigation and SHALL NOT render a persistent internal tab bar for Hub, Register, Categories and Payroll. The expenses hub SHALL expose `Registrar egreso` as its primary header action and `Sueldos` and `Rubros` as secondary header actions. The other top-level expenses routes SHALL expose only the contextual header actions needed to continue the task or return to the hub. Activating one of these actions SHALL provide immediate, non-decorative progress feedback, prevent duplicate activation, and keep the destination from rendering as an unstructured blank region while its primary content is loading.

#### Scenario: Hub exposes the operational actions
- **WHEN** an Admin opens `/expenses`
- **THEN** the header shows `Registrar egreso` as the primary action plus secondary actions for `Sueldos` and `Rubros`, and no persistent internal tab bar is rendered

#### Scenario: Task screen does not repeat the full subnavigation
- **WHEN** an Admin opens `/expenses/new`, `/expenses/categories` or `/expenses/payroll`
- **THEN** the header shows only the contextual actions for that task or to return to the hub, and does not render Hub, Register, Categories and Payroll as a persistent tab set

#### Scenario: Navigation gives immediate progress feedback
- **WHEN** an Admin activates an expenses header action
- **THEN** the activated action immediately communicates that navigation is in progress, cannot be activated again while pending, and the focus remains visible until the destination takes over

#### Scenario: Delayed destination remains structured
- **WHEN** the destination route or its primary data takes long enough for loading to be perceptible
- **THEN** the destination shows a skeleton matching its principal layout instead of a blank content region

#### Scenario: Reduced motion preserves feedback
- **WHEN** the user has enabled reduced motion and navigates through expenses
- **THEN** progress and loading feedback remain available without a decorative page transition or animated displacement

### Requirement: Expenses hub summarizes the period
The frontend SHALL provide `/expenses` as the hub of the expenses section, restricted to role `admin`. The hub SHALL show, for an operator-selected date range defaulting to the current month, the period totals sourced from the backend aggregation endpoint — never computed by summing a paginated list — broken down by expense type, by expense category and by payment method. Business expenses and owner draws SHALL be shown as two separate, separately labelled figures and SHALL NOT be added into a single total. Below the totals the hub SHALL list the period's expenses with date, type, category, payment method, amount, description and status, paginated, and SHALL offer filters by date range, type, category, payment method and status. Below the desktop breakpoint the hub SHALL remain operable without page-level horizontal overflow.

#### Scenario: Period totals come from the backend
- **WHEN** an Admin opens `/expenses`
- **THEN** the period totals are requested from the aggregation endpoint and are not derived from the listed page of expenses

#### Scenario: Owner draws are not counted as business expenses
- **WHEN** the period contains both business expenses and owner draws
- **THEN** the hub shows the business-expense total and an owner-draw total labelled `Retiros personales` as two separate figures, and no displayed figure adds them together

#### Scenario: Voided expenses contribute nothing
- **WHEN** the period contains a voided expense
- **THEN** it is listed as voided and contributes zero to every total shown

#### Scenario: Filters distinguish no results from no data
- **WHEN** filters are applied and no expense matches
- **THEN** the empty message names the applied filters and offers to clear them, and differs from the message shown when no expense has ever been registered

#### Scenario: First use
- **WHEN** no expense has ever been registered
- **THEN** the hub explains what the section is for and offers the action to register the first expense, without implying an error

#### Scenario: Non-admin cannot reach the section
- **WHEN** a user without role `admin` navigates directly to `/expenses`
- **THEN** they are redirected away and no expense data is requested

#### Scenario: Responsive hub
- **WHEN** the hub is used below the desktop breakpoint
- **THEN** the totals stack in a single column without truncating amounts, the expense list remains readable without page-level horizontal overflow, and every row action keeps a touch target of at least 44 px

### Requirement: Expense is classified by type, category and payment method
The frontend SHALL classify every expense along three independent axes: a closed **type** — operating expense, purchase, payroll, self-consumption or owner draw — that determines which fields the form requires; an open, admin-managed **category**; and a closed **payment method** — register cash, owner funds, transfer or card. The three SHALL be selectable independently, and the frontend SHALL NOT collapse them into a single field or derive one from another. Only the payment method SHALL determine whether the expense affects the cash register, and an expense paid with register cash SHALL be identified as affecting the day's cash by text, not by colour alone.

#### Scenario: Same category, different cash impact
- **WHEN** two expenses share a category and type but one is paid with register cash and the other with owner funds
- **THEN** only the register-cash one is identified as affecting the day's cash, and both keep the same category and type

#### Scenario: Owner draw takes no category
- **WHEN** the user selects the owner-draw type
- **THEN** the category field is not required and is not rendered as an unfilled required control

#### Scenario: Payroll type cannot be created by hand
- **WHEN** the user opens the expense form
- **THEN** the payroll type is not offered among the selectable types, while remaining available as a filter and as a value in the list

### Requirement: Registering an expense
The frontend SHALL provide `/expenses/new`, restricted to role `admin`, with a single form whose required fields depend on the selected type. The form SHALL always require date, amount, payment method and description, and SHALL require a category for every type except owner draw. Selecting the purchase type SHALL additionally offer an optional supplier and optional product lines. Selecting the self-consumption type SHALL require at least one product line and SHALL show the amount as read-only, valued by the backend at cost. Changing the type SHALL preserve the values already entered in fields the new type also uses, SHALL discard only what the new type does not accept, and SHALL warn before discarding. The form SHALL prevent double submission and SHALL never retry a failed submission automatically.

#### Scenario: Registering an operating expense
- **WHEN** an Admin submits a valid operating expense with amount, category, payment method, date and description
- **THEN** the expense is created and appears in the hub list for that period

#### Scenario: Type change preserves shared values
- **WHEN** the user has entered an amount and description and then changes the type
- **THEN** the amount and description are preserved, and any field the new type does not accept is discarded only after an explicit warning

#### Scenario: Self-consumption amount is not editable
- **WHEN** the user selects the self-consumption type and adds product lines
- **THEN** the amount is displayed as read-only, valued at cost by the backend, and the client does not compute or send it

#### Scenario: Self-consumption requires product lines
- **WHEN** the user submits a self-consumption expense with no product line
- **THEN** submission is blocked with a validation message and focus moves to the product-line control

#### Scenario: Insufficient stock is reported per line
- **WHEN** the backend rejects a self-consumption expense because a product would go negative
- **THEN** the error is shown on that product's line naming the product and its available stock, not as a single form-level error

#### Scenario: Weighable quantity
- **WHEN** a product line references a `pesable` product
- **THEN** the quantity accepts a decimal value expressed in the product's unit and is sent as a decimal string, without conversion to an integer

#### Scenario: Submission failure preserves input
- **WHEN** the backend rejects the submission or the request fails
- **THEN** everything entered is preserved, the error is shown at form level, and no automatic retry is issued

#### Scenario: Double submission is prevented
- **WHEN** the user activates the submit control twice in quick succession
- **THEN** only one expense is created

### Requirement: Expenses are voided, never deleted
The frontend SHALL NOT offer deletion or editing of a registered expense. It SHALL offer to void an active expense from its detail at `/expenses/[id]`, behind an explicit confirmation that states, in terms specific to that expense's type, what voiding reverts, and that captures a reason. A voided expense SHALL remain listed, identified as voided by text, showing who voided it, when, and the reason, with no further actions available. When the cash closing of the expense's business date is already sealed, the frontend SHALL disable the void action and state the reason, and SHALL still treat a rejection from the backend as authoritative if the action is attempted.

#### Scenario: Voiding requires confirmation
- **WHEN** an Admin voids an active expense
- **THEN** a confirmation states what will be reverted, and the expense is only voided after explicit confirmation

#### Scenario: The stated effect matches the expense type
- **WHEN** the confirmation is shown for a self-consumption, payroll or purchase expense
- **THEN** it names that type's specific consequence — stock returned, settled days released, or stock to review — rather than a single generic message

#### Scenario: Voided expense keeps its trace
- **WHEN** an expense has been voided
- **THEN** it remains in the list identified as voided by text, showing who voided it, when, and the reason given, and offers no actions

#### Scenario: Sealed day blocks voiding
- **WHEN** the cash closing of the expense's business date is sealed
- **THEN** the void action is disabled with the reason stated

#### Scenario: Backend rejection wins
- **WHEN** the frontend believes voiding is allowed but the backend rejects it because the day is sealed
- **THEN** the rejection is shown with its specific message and the action becomes unavailable after refreshing

#### Scenario: No edit path exists
- **WHEN** an Admin views an expense detail
- **THEN** no control offers to edit or delete it

### Requirement: Expense categories are managed, not hardcoded
The frontend SHALL provide `/expenses/categories`, restricted to role `admin`, to create, rename and archive expense categories. An archived category SHALL continue to label the historical expenses that use it and SHALL NOT be selectable for a new expense. The frontend SHALL NOT offer permanent deletion.

#### Scenario: Creating a category
- **WHEN** an Admin creates a category
- **THEN** it becomes selectable in the expense form

#### Scenario: Archiving a category
- **WHEN** an Admin archives a category
- **THEN** it disappears from the expense form's choices while existing expenses keep showing it as their category

#### Scenario: No deletion offered
- **WHEN** an Admin views the category list
- **THEN** no control offers permanent deletion

#### Scenario: Category totals include archived categories
- **WHEN** the period contains expenses in an archived category
- **THEN** the hub's per-category totals include that category, labelled as archived

### Requirement: Working hours are recorded per employee and day
The frontend SHALL provide `/expenses/payroll`, restricted to role `admin`, to record hours worked per employee and per business date. The employee SHALL be a system user, and only users holding an hourly rate SHALL be offered for new entries. The frontend SHALL compute and display the amount as hours multiplied by the rate recorded on the entry, and SHALL let the operator override that amount, requiring a reason whenever the final amount differs from the computed one. An overridden entry SHALL be identified as such by text, not by colour alone, and both figures SHALL remain visible. An entry already settled SHALL NOT be editable or removable.

#### Scenario: Recording hours computes the amount
- **WHEN** an Admin records hours for an employee on a date
- **THEN** the amount is shown as hours multiplied by that employee's hourly rate

#### Scenario: Overriding requires a reason
- **WHEN** the operator changes the amount away from the computed value
- **THEN** a reason is required before the entry can be saved

#### Scenario: Overridden entry is legible
- **WHEN** an entry has an overridden amount
- **THEN** it is identified as adjusted by text, and both the computed and the final amounts are shown

#### Scenario: No employees have an hourly rate yet
- **WHEN** no user has an hourly rate
- **THEN** the screen explains that no employee has an hourly rate and links to user management, without implying an error

#### Scenario: Employee without hours in the period
- **WHEN** an employee with an hourly rate has no hours in the selected period
- **THEN** they are listed with a zero total rather than omitted

#### Scenario: Settled entry is frozen
- **WHEN** an entry belongs to a settled payroll payment
- **THEN** it cannot be edited or removed, and the reason is stated

### Requirement: Payroll settlement generates its expense
The frontend SHALL let an Admin settle an employee's unsettled hours for a selected period. Before persisting, it SHALL require an explicit confirmation showing the employee, the period, the total hours, the total amount and the payment method. On success the settlement SHALL be reflected as an expense of the payroll type, which the frontend SHALL NOT create separately. When the backend reports that the hours were settled concurrently, the frontend SHALL refresh the pending amounts and explain what happened rather than retrying.

#### Scenario: Settlement is confirmed explicitly
- **WHEN** an Admin settles an employee's period
- **THEN** a confirmation shows employee, period, total hours, total amount and payment method before anything is persisted

#### Scenario: Settlement produces one expense
- **WHEN** a settlement succeeds
- **THEN** a payroll-type expense for that amount appears in the expenses list, and the frontend issues no separate expense creation

#### Scenario: Concurrent settlement
- **WHEN** the backend rejects the settlement because those hours were already settled
- **THEN** the pending amounts are refreshed and the situation is explained, with no automatic retry

#### Scenario: Nothing pending
- **WHEN** an employee has no unsettled hours in the period
- **THEN** the settle action is unavailable and the reason is stated

### Requirement: Per-employee payroll report
The frontend SHALL provide `/expenses/payroll/[userId]`, restricted to role `admin`, showing for a selected period that employee's recorded days with hours, computed amount, final amount and adjustment reason; their settlements with period, amount, payment method and date; and the amount still pending. The report SHALL be reachable from the payroll screen and SHALL remain available for a deactivated user who has recorded hours or settlements.

#### Scenario: Reconciling with an employee
- **WHEN** an Admin opens an employee's payroll report for a period
- **THEN** it shows the recorded days, the settlements and the outstanding pending amount

#### Scenario: Deactivated employee keeps their history
- **WHEN** the employee's user account is inactive but has recorded hours or settlements
- **THEN** their report remains reachable and shows their history, while new hours cannot be recorded for them

#### Scenario: No activity in the period
- **WHEN** the employee has neither hours nor settlements in the period
- **THEN** the report states that there is no activity in the period, without implying an error
