# Proposal: add-frontend-mvp

## Why

The Kiosco App backend (Go, REST JSON) already defines the MVP business capabilities — identity, catalog, inventory, sales, reporting — but there is no user interface. Cashiers and managers need a fast, minimal Next.js frontend to operate the kiosk daily: register sales via barcode scanning, manage products and stock, and view basic reports.

## What Changes

- Bootstrap a Next.js (App Router, TypeScript, Tailwind) application in `frontend/` implementing the design system defined in `CLAUDE.md` (fixed palette, 12px radius, soft shadows, light theme only).
- Session handling against `POST /auth/login` / `POST /auth/logout` with opaque Bearer tokens and role-based UI gating (Admin, Cashier, Inventory Manager).
- POS screen (critical path): barcode-scan-driven cart, single payment method (cash/card), atomic sale confirmation.
- Product catalog screens: list, create, edit, deactivate; category management (Admin).
- Inventory screens: stock per product, initialize stock, manual adjustment with mandatory reason.
- Reports screens: sales summary, top products, stock history (read-only).
- Shared UI kit (Button, Input, Card, Badge, Table, Dialog, Toast) built on the design tokens.

## Capabilities

### New Capabilities
- `ui-foundation`: App shell, design-system tokens, shared UI kit, navigation, role-gated layout.
- `ui-auth`: Login/logout flow, session storage, expiry handling, role resolution.
- `ui-pos`: Sale registration flow — scan input, cart, payment method, confirm, failure handling.
- `ui-catalog`: Product list/detail/create/edit/deactivate and category management.
- `ui-inventory`: Stock view, stock initialization, manual adjustment with reason.
- `ui-reports`: Sales summary, top products, stock movement history views.

### Modified Capabilities

None — this is the first frontend change; backend specs are untouched.

## Impact

- New code across the entire `frontend/` directory (Next.js app).
- Consumes backend API `/api/v1/*` (base URL via `NEXT_PUBLIC_API_URL`).
- Known backend gaps the frontend depends on: `POST /sales` and `POST /sales/{id}/confirm` currently return 501; no endpoints yet for sales history, low-stock list, category update/delete, or user management. These are flagged, not mocked.
- No new backend dependencies; frontend adds Next.js/Tailwind toolchain.
