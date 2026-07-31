## MODIFIED Requirements

### Requirement: Create product
The frontend SHALL provide a creation form with name, SKU, optional barcode, category (from `GET /api/v1/categories`), price, and cost, submitting to `POST /api/v1/products`. Prices and costs SHALL be entered and sent as decimal strings. When a category is selected, the frontend SHALL request a SKU proposal from `GET /api/v1/products/sku-suggestion?category_id={id}` through the shared API client and SHALL display a returned value in the editable SKU field only when the user has not manually edited that field. Automatic SKUs SHALL use the format `SKU-` followed by three digits from `001` to `999`; the category SHALL NOT be part of the SKU. The frontend SHALL not generate or reserve SKUs.

#### Scenario: Successful creation
- **WHEN** a valid product is submitted
- **THEN** the product is created, a success toast appears, the list shows the new product as active, and the SKU returned by the backend is shown as the effective SKU

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

#### Scenario: Automatic SKU format
- **WHEN** the backend returns an automatic SKU proposal or the created product
- **THEN** the displayed automatic SKU matches `SKU-` plus a three-digit number from `001` through `999`, with no category text in the value

