# Frontend Spec — Kiosco App

## 1. Project Context

Kiosco App is a point-of-sale and inventory management system for small, single-location retail kiosks operated by 1–5 people. This directory holds the **frontend**; the backend (Go, REST JSON, PostgreSQL) lives in the sibling `../backend` directory and is the source of truth for all business rules.

The frontend's job is operational speed and clarity:

- A cashier must complete a sale in the fewest possible steps, driven by **barcode scanning** (the reader acts as keyboard input — no hardware integration).
- Stock and catalog screens must be simple admin CRUD views with clear feedback.
- The UI never enforces business rules on its own; it reflects the backend's decisions and surfaces its errors clearly.

Tech stack:

- Framework: **Next.js** (App Router, TypeScript)
- Styling: Tailwind CSS mapped to the design tokens below
- Data fetching: plain `fetch` against the backend REST API (add a query library only if real need appears)
- No global state library unless justified — server state lives in the API, UI state stays local

Skills to use:

- **`frontend-design`** — always invoke when creating or reshaping UI. All visual work follows that skill's process (plan tokens → critique → build), constrained by the Design System in section 4.
- **`frontend-kiosco-app`** — project skill for building screens aligned with backend specs.

Backend references (read when behavior is unclear):

- `../backend/docs/specs/00-system-overview.md` — business flows and rules
- `../backend/openspec/specs/` — normative requirement/scenario specs per module
- `../backend/kiosco-insomnia.json` — request examples

---

## 2. Users and Roles

Each user has exactly **one** role. The UI shows only what the role can do.

| Role | Screens | Notes |
|---|---|---|
| **Cashier** | POS (new sale), own sales history (defaults to today), returns on their own confirmed sales the same day | Primary daily user; speed is everything |
| **Inventory Manager** | Products, stock, movements | Every adjustment requires a reason |
| **Admin** | Everything + categories + users | Low-frequency, high-trust operations |

---

## 3. Pages (MVP)

| Route | Purpose | Roles |
|---|---|---|
| `/login` | Username + password login | all |
| `/` (POS) | New sale: scan barcode → item list → payment method (cash/card) → confirm | Cashier, Admin |
| `/products` | Product list (search, filter by category/active), create/edit/deactivate | Inv. Manager, Admin |
| `/products/[id]` | Product detail/edit | Inv. Manager, Admin |
| `/inventory` | Stock levels per product, adjust stock (delta + mandatory reason) | Inv. Manager, Admin |
| `/categories` | Category management | Admin |
| `/reports` | Sales summary by date range, top products, stock history | Admin (Owner role is future) |

Out of scope for MVP (do not build): discounts, multi-payment, customers, suppliers, CSV export, notifications, offline mode, dark mode. Returns are in scope as of `add-frontend-sales-returns` (see §5) — registered against a confirmed sale, never as a standalone refund flow.

### POS flow (critical path)

1. Page loads with focus on a scan input; focus returns there after every action.
2. Scanned barcode → `GET /products/barcode/{barcode}` → item added with current price; repeated scans increment quantity.
3. Inactive/unknown products show an inline error and never enter the cart.
4. Select payment method (cash or card), confirm → `POST /sales` then `POST /sales/{id}/confirm`.
5. Confirmation is atomic on the backend. On network failure, **never assume success** — re-check state; the backend sale status is authoritative.

---

## 4. Design System

Minimalist, modern, clean. Lots of white space, 12px rounded corners, soft shadows, readability and contrast first. **Use only these colors** unless strictly necessary.

### Tokens

```
/* Base — Mini Moni mauve/rose brand palette (#C08497 #DFB2C4 #E8C5D5 #F0D9E3 #F8EDF1).
   Interactive darks are derived from #C08497 to keep white-on-primary text at WCAG AA. */
--primary:        #9C566C;   /* main buttons, links, important actions */
--primary-hover:  #85485C;
--primary-light:  #F0D9E3;
--secondary:      #C08497;   /* visible brand accent */
--secondary-hover:#9C566C;

/* Pastels — categories, badges, cards, decorative only */
--pastel-pink:    #DFB2C4;
--pastel-peach:   #FFDFBA;
--pastel-yellow:  #FFFFBA;
--pastel-green:   #BAFFC9;
--pastel-blue:    #BAE1FF;

/* State */
--success:        #22C55E;   /* only for confirmed successful operations */
--warning:        #F59E0B;   /* alerts (e.g. low stock) */
--error:          #EF4444;   /* delete, cancel, errors only */
--info:           #0EA5E9;

/* Backgrounds */
--background:     #F8EDF1;   /* soft rose page background */
--surface:        #FFFFFF;   /* cards stay white for readability */
--surface-2:      #F0D9E3;

/* Text */
--text-primary:   #1F2937;
--text-secondary: #6B7280;
--text-disabled:  #9CA3AF;
--text-inverse:   #FFFFFF;

/* Borders */
--border:         #E8C5D5;
--border-hover:   #DFB2C4;

/* Rose ramp — Mini Moni brand accents (decorative surfaces, e.g. sale receipt modal) */
--rose-light:     #F8EDF1;
--rose:           #E8C5D5;
--rose-strong:    #85485C;
```

### Usage rules

- Primary = primary buttons, links, key actions. Secondary for supporting accents.
- Success **only** to confirm successful operations; Error **only** for delete/cancel/errors; Warning for alerts.
- Pastels **only** for category colors, badges, cards, decorative elements — **never** as primary buttons.
- Border radius: 12px. Shadows: soft. Layout: generous white space.
- Light theme only.

---

## 5. API Contract

Base URL: `NEXT_PUBLIC_API_URL` (backend default `http://localhost:8080`), prefix `/api/v1`.

### Conventions

- Auth: `POST /auth/login` returns `{ token, expires_at, role }`. Send `Authorization: Bearer <token>` on every request. Tokens are opaque, server-side sessions — on `401`, clear session and redirect to `/login`.
- Money is always a **decimal string** (`"12.50"`), never a float. Display as-is; never do float math on prices (sum with a decimal helper or integer cents).
- Errors: `{ "message": "..." }`. Surface the message; don't invent client-side rules.
- Timestamps are RFC3339 strings.

### Endpoints

| Method & path | Purpose |
|---|---|
| `POST /auth/login` · `POST /auth/logout` | Session |
| `GET /products` | List `{ products: [], total }` |
| `GET /products/{id}` · `GET /products/barcode/{barcode}` | Lookup |
| `POST /products` · `PUT /products/{id}` · `POST /products/{id}/deactivate` · `POST /products/{id}/activate` | CRUD (no hard delete) |
| `GET /categories` · `POST /categories` | Categories |
| `GET /inventory/stock/{product_id}` | Stock `{ product_id, quantity, minimum_quantity, updated_at }` |
| `GET /inventory/stock?search=&limit=&offset=` | Paginated product+stock list `{ items: [{ product_id, sku, name, barcode, active, initialized, quantity, minimum_quantity, updated_at }], total }` |
| `POST /inventory/stock` | Initialize stock `{ product_id, quantity, reason }` |
| `POST /inventory/stock/{product_id}/adjust` | Adjust `{ quantity_delta, reason }` — reason is mandatory |
| `POST /sales` · `GET /sales/{id}` | Draft lifecycle — create, read. `GET /sales/{id}` scopes `cashier` to sales they confirmed (any date, no day limit) |
| `POST /sales/{id}/items` · `PUT /sales/{id}/items/{item_id}` · `DELETE /sales/{id}/items/{item_id}` | Draft items — add, change quantity, remove |
| `PUT /sales/{id}/payment` · `POST /sales/{id}/confirm` | Payment method + atomic confirm |
| `GET /sales` | Operational listing `{ items: [], page, limit, total }`. `admin` unrestricted; `cashier` forced server-side to their own `cashier_id`, ignoring any `cashier_id` sent in the query |
| `POST /sales/{id}/returns` · `GET /sales/{id}/returns` · `GET /returns/{id}` | Partial return by item, mandatory reason, automatic stock reintegration. `admin` on any confirmed sale; `cashier` only on sales they confirmed themselves the same calendar day (server-enforced, `403` otherwise) |
| `GET /reports/sales` · `GET /reports/sales/{id}` | Sale history `{ sales: [] }` + detail with items |
| `GET /reports/sales/summary` · `GET /reports/products/top` · `GET /reports/stock/history` | Reporting (read-only) |

Product shape: `{ id, sku, barcode (nullable), name, category_id, price, cost, active, created_at, updated_at }`.

**Every `/reports/*` endpoint is Admin-only** (enforced in the backend router) — this did not change. Cashiers now have access to `GET /sales` (their own sales only) and to returns (their own, same-day sales only); they still have no access to any `/reports/*` listing.

⚠️ There are not yet endpoints for: user management (`/users`), low-stock list (`/inventory/stock/low`), setting minimum quantity (`PUT /inventory/stock/{product_id}/minimum`), category update/delete (`PUT /categories/{id}`), or the Admin sales-list endpoint (`GET /sales`, distinct from `/reports/sales`). These are specified for V1.5 in `../backend/docs/specs/backend/` but not implemented. When a screen needs one, check the backend first — if missing, flag it instead of mocking silently.

---

## 6. Frontend Conventions

- **App Router** with a route group per area; auth guard + role check in a shared layout. Store the token in an httpOnly cookie via a Next.js route handler (not localStorage) if feasible; otherwise document the tradeoff.
- Components: small, colocated by feature (`app/(pos)/…`, `components/ui/…` for shared primitives). Build a tiny UI kit first (Button, Input, Card, Badge, Table, Dialog, Toast) using the tokens — every screen composes these; no ad-hoc styling per page.
- Forms: controlled, disable submit while pending, show backend `message` on failure. Success feedback via toast (Success color).
- All user-facing text in **Spanish**; code, comments, and identifiers in English.
- Keyboard-first on POS: scan input autofocus, Enter confirms, visible focus states everywhere.
- Quality floor: responsive down to mobile, visible keyboard focus, `prefers-reduced-motion` respected.

---

## 7. Definition of Done for a Screen

1. Matches the design system (tokens only, 12px radius, soft shadows, white space).
2. Uses real backend endpoints — no silent mocks.
3. Handles loading, empty, and error states explicitly (empty states invite action; errors say what happened and how to fix it).
4. Role-gated correctly.
5. Spanish copy, active voice, consistent action names (button "Confirmar venta" → toast "Venta confirmada").
