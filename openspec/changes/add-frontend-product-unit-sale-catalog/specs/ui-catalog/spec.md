## MODIFIED Requirements

### Requirement: Product list

The frontend SHALL show the product list from `GET /api/v1/products` with name,
SKU, barcode, category, price, and active status, plus client-side search by
name/SKU/barcode and filters by category and active state. For a product whose
`unit_type` is `pesable`, the price column SHALL show `price_per_kg` formatted as
money with a "/kg" suffix, instead of `price`. For a product whose `unit_type` is
`unitario` (including a product where the backend omits `unit_type`, which SHALL
be treated as `unitario`), the price column SHALL be unchanged from today.

A product the backend identifies as derived from another product for loose-unit
sale SHALL additionally show a text badge reading "Por unidad", both in the
desktop table and in the mobile card view. The derived state SHALL NOT be
communicated by colour alone, and the badge SHALL remain legible from 320 px
without pushing the row into horizontal scroll.

#### Scenario: List renders products
- **WHEN** the product list loads
- **THEN** each product shows name, SKU, barcode (or a dash when null), category, price, and an active/inactive badge

#### Scenario: Filter by category
- **WHEN** a category filter is applied
- **THEN** only products of that category are listed

#### Scenario: Weighable product shows its per-kilogram price
- **WHEN** the product list includes a product with `unit_type` `pesable`
- **THEN** its price column shows `price_per_kg` as money with a "/kg" suffix, not `price`

#### Scenario: Unit-based product is unaffected
- **WHEN** the product list includes a product with `unit_type` `unitario`, or a product whose response omits `unit_type` entirely
- **THEN** its price column shows `price` exactly as it does today

#### Scenario: Derived unit product is marked in the list
- **WHEN** the product list includes a product the backend identifies as
  derived for loose-unit sale
- **THEN** that row shows a text badge "Por unidad" alongside its name, in both
  the desktop table and the mobile card view

#### Scenario: A non-derived product shows no unit badge
- **WHEN** the product list includes a product that is not derived, whether or
  not it sells by unit
- **THEN** no "Por unidad" badge is rendered for that row

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

When and only when the chosen product type is `unitario`, the form SHALL offer,
immediately after the price block, a checkbox labelled "Este producto también se
vende por unidad". Checking it SHALL reveal exactly three fields — "Unidades por
paquete" (integer, at least 2), "Margen extra por unidad (%)", and "Precio de
venta por unidad" (decimal string) — and SHALL move keyboard focus to "Unidades
por paquete". Unchecking it SHALL hide those three fields and leave focus on the
checkbox. The checkbox SHALL expose `aria-expanded` and `aria-controls` over the
revealed block, and the revealed fields SHALL stack in a single column from
320 px without horizontal scroll.

While that block is visible, the frontend SHALL keep "Precio de venta por unidad"
automatically derived as
`(package price ÷ units per package) × (1 + extra margin ÷ 100)`, rounded with
the same suggested-price rounding the form already applies to the sale price, and
SHALL display the calculation basis as help text associated with the field via
`aria-describedby` (for example `Base: $ 708,00 · +20% = $ 850,00`). The user
SHALL be able to override that price; overriding it SHALL derive the
corresponding "Margen extra por unidad (%)" and update that field, so that units,
margin, and unit price stay mutually consistent regardless of which one was
edited last. Money SHALL be handled as decimal strings, never as floating-point
numbers. The client-side value is a suggestion only: the authoritative unit price
and derived cost are computed by the backend, and after a successful save the
frontend SHALL display the values the backend returned.

Submitting with the checkbox marked SHALL send the units per package and the
extra margin to `POST /api/v1/products`; the frontend SHALL NOT send a derived
cost for the unit product. On success the backend creates two products — the
package and a derived product named `{name} (unidad)` — and the success popup
SHALL name both products with their effective SKUs, while keeping exactly the two
actions it offers today ("Inicializar stock", which navigates to the inventory
screen with the created package product preselected and its stock dialog already
open, and "Ahora no", which closes the popup and returns to a blank creation
form). Dismissing the popup by any other means (`Escape`, clicking outside, its
close control) SHALL have the same effect as "Ahora no". The frontend SHALL NOT
automatically redirect to the product list on successful creation. When only one
product is created, the popup SHALL be unchanged from today.

The frontend SHALL block creation when the product name, or the derived
`{name} (unidad)` name when the checkbox is marked, collides with an existing
product (active or inactive). The collision SHALL be surfaced as an inline
warning next to the name field naming the conflicting product and its SKU, with a
link to that product's detail view, and SHALL disable submission until the name
field's value changes — the same pattern already used for a duplicate barcode. A
collision detected by the backend when the form is submitted SHALL produce the
same warning. A failure of the pre-submit collision check itself (network or
server error) SHALL NOT show a warning and SHALL NOT block submission; the
backend's own rejection remains the final safeguard.

#### Scenario: Successful creation
- **WHEN** a valid product is submitted and created
- **THEN** a success popup appears naming the product and the SKU returned
  by the backend as the effective SKU, offering "Inicializar stock" and
  "Ahora no", and the form is not automatically redirected to the product
  list

#### Scenario: "Inicializar stock" opens the new product's stock dialog
- **WHEN** the user activates "Inicializar stock" on the success popup
- **THEN** the frontend navigates to the inventory screen with the created
  package product preselected and its "Gestionar stock" dialog already open in
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
- **WHEN** `unitario` is chosen as the product type and the unit-sale checkbox is
  left unmarked
- **THEN** the form behaves exactly as it did before this requirement changed:
  name, SKU, barcode, category, `price`, and `cost`, with no reference to weight
  or a per-kilogram price, aside from the barcode field's position and duplicate
  check and the unmarked checkbox described above

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

#### Scenario: Marking the unit-sale checkbox reveals three fields
- **WHEN** the product type is `unitario` and the user marks "Este producto
  también se vende por unidad"
- **THEN** exactly three fields appear — "Unidades por paquete", "Margen extra
  por unidad (%)" and "Precio de venta por unidad" — keyboard focus moves to
  "Unidades por paquete", and the checkbox reports the block as expanded

#### Scenario: The unit price is derived from the package price
- **WHEN** the package price, the units per package, or the extra margin changes
  while the block is visible
- **THEN** "Precio de venta por unidad" is recomputed as
  `(package price ÷ units per package) × (1 + extra margin ÷ 100)` with the
  form's suggested-price rounding, and help text associated with the field shows
  the calculation basis

#### Scenario: Overriding the unit price derives the extra margin
- **WHEN** the user types a different value into "Precio de venta por unidad"
- **THEN** "Margen extra por unidad (%)" is recomputed from the package price,
  the units per package and the typed price, and the typed price is preserved

#### Scenario: Incomplete input leaves the unit price alone
- **WHEN** the package price, the units per package or the extra margin is empty,
  non-numeric, or the units per package is below 2
- **THEN** no unit price is derived, the previously entered value is preserved,
  and no calculation basis is displayed

#### Scenario: Weighable products cannot be sold by unit
- **WHEN** the product type is `pesable`
- **THEN** the unit-sale checkbox is not rendered at all, and switching the type
  from `unitario` to `pesable` while the block is open closes it and drops its
  values from the submitted payload

#### Scenario: Creating a product that also sells by unit
- **WHEN** a product is submitted with the unit-sale checkbox marked and the
  backend creates both the package and its derived unit product
- **THEN** the success popup names both products with their effective SKUs, one
  per line, and still offers exactly "Inicializar stock" and "Ahora no"

#### Scenario: Invalid units per package is a validation error
- **WHEN** the backend rejects the product for an invalid units-per-package or
  extra-margin value
- **THEN** the backend message is shown beneath that field and every other
  entered value is preserved

#### Scenario: Colliding product name blocks creation
- **WHEN** the entered name, or the derived `{name} (unidad)` name, matches an
  existing product — active or inactive — whether detected before submitting or
  by the backend rejecting the submission
- **THEN** an inline warning next to the name field names the conflicting product
  and its SKU, links to its detail view, and the submit action is disabled

#### Scenario: Editing the name clears a detected collision
- **WHEN** the name field's value changes after a collision was detected
- **THEN** the warning and the submission block are cleared immediately

#### Scenario: Name collision check failure does not block creation
- **WHEN** the pre-submit name collision check itself fails with a network or
  server error
- **THEN** no warning is shown, submission is not blocked by this check, and the
  backend's own rejection at submit time remains the final safeguard

#### Scenario: The unit-sale block is usable on a small screen
- **WHEN** the creation form is used at 320 px width with the unit-sale block
  open
- **THEN** the three fields stack in a single column, the calculation help text
  wraps instead of overflowing, and there is no horizontal scroll

### Requirement: Edit product

The frontend SHALL allow editing an existing product via
`PUT /api/v1/products/{id}` from a detail view at `/products/[id]`, including its
product type and, when applicable, `price_per_kg` instead of `price`.

For a `unitario` product, the edit form SHALL show the same unit-sale checkbox and
three fields as the creation form, pre-filled from the persisted units per
package, extra margin and unit price. The persisted extra margin — not the unit
price — is what the backend uses to keep the derived product's price
synchronised, so the frontend SHALL send it on save.

The edit form SHALL display, as persistent inline text announced politely to
assistive technology and never as colour alone or as an ephemeral toast:

- when "Unidades por paquete" is modified, a warning stating that the change
  affects future conversions only, that current stock is not modified, and that
  an already-opened package may keep more loose units than the new package size
  until they are consumed;
- when the package price is modified on a product that sells by unit, a warning
  stating that the unit price will be recomputed from the saved extra margin and
  that any manually entered unit price is lost.

Neither warning SHALL move keyboard focus.

Unmarking the checkbox SHALL, on save, deactivate the derived unit product while
preserving its sales history and its stock; the form SHALL state this before
saving. Marking it again on a product whose derived unit product already exists
SHALL reactivate that same record rather than create a new one. Because
reactivation is an administrative act, when the derived product is inactive and
the user is not an Admin the checkbox SHALL be rendered disabled with an
associated explanation ("Sólo un administrador puede volver a habilitar la venta
por unidad"); when the derived product is active, the checkbox SHALL be operable
for Inventory Manager and Admin alike.

A product the backend identifies as derived for loose-unit sale SHALL NOT be
editable: its `/products/[id]` view SHALL present read-only detail with a text
badge "Por unidad", an explanation that the product is generated from its parent,
and a link to the parent product's detail; no edit form SHALL be offered for it.
Conversely, a package product that sells by unit SHALL show its derived product's
name, SKU, unit price and active state, with a link to that product's detail.

#### Scenario: Successful edit
- **WHEN** valid changes are saved
- **THEN** the product is updated and the user sees a success toast

#### Scenario: Existing product without a type defaults to unit-based
- **WHEN** an existing product's response omits `unit_type` (a backend not yet migrated)
- **THEN** the edit form treats it as `unitario`, not as an empty or error state

#### Scenario: Editing a product that already sells by unit
- **WHEN** a `unitario` product that sells by unit is opened for editing
- **THEN** the checkbox is marked and the three fields show the persisted units
  per package, extra margin and unit price

#### Scenario: Changing units per package warns without touching stock
- **WHEN** the user changes "Unidades por paquete" on a saved product
- **THEN** an inline warning states that only future conversions are affected,
  that current stock is not modified, and that an opened package may hold more
  loose units than the new package size until they are consumed, and keyboard
  focus does not move

#### Scenario: Changing the package price warns about the recalculated unit price
- **WHEN** the user changes the package price on a product that sells by unit
- **THEN** an inline warning states that the unit price will be recomputed from
  the saved extra margin and that any manually entered unit price is lost

#### Scenario: Unmarking the checkbox deactivates the derived product
- **WHEN** the user unmarks the unit-sale checkbox and saves
- **THEN** the form states beforehand that the unit product will be deactivated
  keeping its history and stock, and after saving the derived product is inactive
  while the package product stays active

#### Scenario: Re-marking the checkbox reactivates the same product
- **WHEN** an Admin marks the unit-sale checkbox again on a product whose derived
  unit product exists but is inactive, and saves
- **THEN** that same derived product becomes active again, with its history
  intact, and no second derived product is created

#### Scenario: Inventory Manager cannot re-enable unit sale
- **WHEN** an Inventory Manager opens a product whose derived unit product is
  inactive
- **THEN** the checkbox is rendered disabled with a visible explanation that only
  an administrator can re-enable unit sale

#### Scenario: Inventory Manager can disable unit sale
- **WHEN** an Inventory Manager opens a product whose derived unit product is
  active
- **THEN** the checkbox is operable and unmarking it deactivates the derived
  product on save

#### Scenario: Re-enabling unit sale rejected by role
- **WHEN** a save that re-enables unit sale is nonetheless rejected with `403`
- **THEN** the backend message is shown, the entered values are preserved, the
  session is not cleared, and the user is not redirected to login

#### Scenario: A derived product is read-only
- **WHEN** a product the backend identifies as derived for loose-unit sale is
  opened at `/products/[id]`
- **THEN** the view shows read-only detail with a "Por unidad" badge, an
  explanation that it is generated from its parent, and a link to the parent's
  detail, and no edit form is offered

#### Scenario: A package product links to its unit product
- **WHEN** a package product that sells by unit is opened at `/products/[id]`
- **THEN** the view shows the derived product's name, SKU, unit price and active
  state, with a link to its detail

#### Scenario: A derived product whose parent is inactive
- **WHEN** a derived product is viewed while its parent package product is
  inactive
- **THEN** the view states in text that the package product is inactive

### Requirement: Deactivate product

The frontend SHALL offer deactivation (no hard delete) via
`POST /api/v1/products/{id}/deactivate` to Admin and Inventory Manager, guarded by
a confirmation dialog styled with the Error color. Reactivation via
`POST /api/v1/products/{id}/activate` SHALL be offered to Admin only; for any
other role the action SHALL be absent from the interface rather than shown
disabled. This asymmetry is deliberate: withdrawing a product from sale is a
reversible operational act, while returning it to sale reverses an administrative
decision.

Deactivating a package product also deactivates its derived unit product; the
coupling is unidirectional and is executed by the backend. The frontend SHALL NOT
issue a second request to deactivate the derived product. The confirmation dialog
for a package product that sells by unit SHALL name, in text, the derived product
that will also become inactive; the confirmation dialog for a derived product
SHALL state that the package product stays active. After either deactivation or
reactivation the frontend SHALL re-read the product and display the resulting
state rather than assume it.

#### Scenario: Deactivation confirmed
- **WHEN** the user confirms deactivation in the dialog
- **THEN** the product becomes inactive and shows an inactive badge in the list

#### Scenario: Inventory Manager cannot reactivate
- **WHEN** an Inventory Manager views an inactive product
- **THEN** the inactive badge is visible and no reactivation control is rendered anywhere on the screen

#### Scenario: Admin reactivates
- **WHEN** an Admin reactivates an inactive product
- **THEN** the product becomes sellable again and a success toast confirms it

#### Scenario: Reactivation rejected by role
- **WHEN** a reactivation request is nonetheless rejected with `403`
- **THEN** the user is told they lack permission, the session is not cleared, and they are not redirected to login

#### Scenario: Deactivating a package announces the coupled unit product
- **WHEN** the user opens the deactivation dialog for a package product that
  sells by unit
- **THEN** the dialog names, in text, the derived unit product that will also
  become inactive, and confirming issues a single deactivation request for the
  package product

#### Scenario: Deactivating a derived product leaves the package active
- **WHEN** the user confirms deactivation of a derived unit product
- **THEN** that product becomes inactive, the dialog had stated that the package
  product stays active, and the package product remains active afterwards

#### Scenario: State after activation is read from the backend
- **WHEN** an Admin reactivates a package product whose derived unit product was
  also inactive
- **THEN** the frontend re-reads the product and shows the derived product's
  actual resulting state instead of assuming it was reactivated
