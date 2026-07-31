## MODIFIED Requirements

### Requirement: Create product

The frontend SHALL provide a creation form with, in order, barcode
(optional, first field, initially focused), name, category (from
`GET /api/v1/categories`), SKU,
an explicit product type (`unitario` or
`pesable`, with no blank or nullable default), cost, and — depending on the
chosen type — either `price` (`unitario`) or `price_per_kg` (`pesable`),
submitting to `POST /api/v1/products`. Money fields (`price`, `cost`,
`price_per_kg`) SHALL be entered and sent as decimal strings. Choosing
`unitario` SHALL leave the rest of the form behaving exactly as before;
choosing `pesable` SHALL replace `price` with `price_per_kg`. When a
category is selected, the frontend SHALL request a SKU proposal from
`GET /api/v1/products/sku-suggestion?category_id={id}` through the shared
API client and SHALL display a returned value in the editable SKU field
only when the user has not manually edited that field. Automatic SKUs SHALL
use the backend-defined format and the frontend SHALL not generate or
reserve SKUs.

Confirming the barcode field with `Enter` — the gesture a physical barcode
scanner emits after reading a code — SHALL query
`GET /api/v1/products/barcode/{barcode}` before that keystroke is allowed to
submit the rest of the form. A response indicating no match SHALL leave the
form exactly as if nothing had been queried. A response indicating a match
(any existing product, active or inactive) SHALL show an inline warning
naming that product and its SKU, with a link to that product's detail view,
and SHALL block form submission until the barcode field's value changes.
This barcode-first ordering and duplicate check apply only to product
creation; the edit form's field order and behavior are unchanged.

On successful creation the frontend SHALL show a success popup naming the
created product and its effective SKU, offering exactly two actions:
"Inicializar stock", which navigates to the inventory screen with that
product preselected and its stock dialog already open, and "Ahora no",
which closes the popup and returns to a blank creation form so the user can
keep entering products. Dismissing the popup by any other means (`Escape`,
clicking outside, its close control) SHALL have the same effect as "Ahora
no". The frontend SHALL NOT automatically redirect to the product list on
successful creation.

#### Scenario: Successful creation
- **WHEN** a valid product is submitted and created
- **THEN** a success popup appears naming the product and the SKU returned
  by the backend as the effective SKU, offering "Inicializar stock" and
  "Ahora no", and the form is not automatically redirected to the product
  list

#### Scenario: "Inicializar stock" opens the new product's stock dialog
- **WHEN** the user activates "Inicializar stock" on the success popup
- **THEN** the frontend navigates to the inventory screen with the created
  product preselected and its "Gestionar stock" dialog already open in
  initialization mode

#### Scenario: "Ahora no" returns to a blank creation form
- **WHEN** the user activates "Ahora no", presses `Escape`, or dismisses the
  popup by any other means
- **THEN** the popup closes and the user is on a blank product creation form,
  ready to enter another product

#### Scenario: Category selection requests a proposal
- **WHEN** the user selects a category
- **THEN** the frontend requests `GET /api/v1/products/sku-suggestion?category_id={id}` and displays a successful response such as `{ "sku": "SKU-123" }` in the editable SKU field

#### Scenario: Manual SKU remains authoritative in the form
- **WHEN** the user edits the SKU field manually and then selects another category or a delayed proposal response arrives
- **THEN** the manually entered SKU is preserved and is not overwritten

#### Scenario: Proposal request fails
- **WHEN** the SKU proposal request fails
- **THEN** the existing form values are preserved, an explanatory error is shown, and the user can enter a SKU manually and continue

#### Scenario: Duplicate SKU or barcode
- **WHEN** the backend rejects the product for a uniqueness violation, including `409`
- **THEN** the backend message is shown, every entered form value is preserved, and the SKU remains editable for a retry

#### Scenario: Creating a unit-based product is unchanged
- **WHEN** `unitario` is chosen as the product type
- **THEN** the form behaves exactly as it did before this requirement changed: name, SKU, barcode, category, `price`, and `cost`, with no reference to weight or a per-kilogram price, aside from the barcode field's new position and duplicate check described above

#### Scenario: Creating a weighable product asks for a per-kilogram price
- **WHEN** `pesable` is chosen as the product type
- **THEN** the form shows `price_per_kg` instead of `price`, as a required decimal string, alongside the rest of the fields

#### Scenario: Product type has no default
- **WHEN** a new product's type has not been explicitly chosen
- **THEN** the form does not allow submission until either `unitario` or `pesable` is selected

#### Scenario: Missing per-kilogram price is a validation error
- **WHEN** the backend rejects a `pesable` product for a missing or invalid `price_per_kg`
- **THEN** the form shows the backend message beneath that field and preserves every other entered value

#### Scenario: Automatic SKU format
- **WHEN** the backend returns an automatic SKU proposal or the created product
- **THEN** the displayed automatic SKU matches `SKU-` plus a three-digit number from `001` through `999`, with no category text in the value

#### Scenario: Barcode field is first and initially focused
- **WHEN** the product creation form loads
- **THEN** the barcode field is the first field in the form and holds initial keyboard focus, ahead of name and every other field

#### Scenario: Scanning an unused barcode has no visible effect
- **WHEN** `Enter` is confirmed in the barcode field and
  `GET /api/v1/products/barcode/{barcode}` finds no match
- **THEN** no warning is shown, the form is not submitted, and the user can
  continue completing the rest of the fields normally

#### Scenario: Scanning a barcode already in use blocks submission
- **WHEN** `Enter` is confirmed in the barcode field and
  `GET /api/v1/products/barcode/{barcode}` finds an existing product, active
  or inactive
- **THEN** an inline warning names that product and its SKU, links to its
  detail view, and the form's submit action is disabled

#### Scenario: Editing the barcode clears a detected duplicate
- **WHEN** the barcode field's value changes after a duplicate was detected
- **THEN** the warning and the submission block are cleared immediately,
  with no new check run until the next `Enter`

#### Scenario: Duplicate check failure does not block creation
- **WHEN** the barcode duplicate check itself fails (network or server
  error, not a `404`)
- **THEN** no warning is shown, submission is not blocked by this check, and
  the backend's own uniqueness rejection at submit time remains the final
  safeguard

#### Scenario: Duplicate check does not run on edit
- **WHEN** an existing product is opened for editing
- **THEN** the barcode field keeps its current position and behavior, with
  no duplicate lookup triggered by `Enter` and no field reordering
