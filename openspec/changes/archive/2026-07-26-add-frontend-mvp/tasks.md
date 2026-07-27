# Tasks: add-frontend-mvp

## 1. Scaffold & Foundation (ui-foundation)

- [x] 1.1 Scaffold Next.js app (App Router, TypeScript, Tailwind) in `frontend/`
- [x] 1.2 Map the CLAUDE.md design tokens into the Tailwind theme (colors, 12px radius, soft shadows) and global styles
- [x] 1.3 Build the UI kit: Button, Input, Card, Badge, Table, Dialog, Toast — following the frontend-design skill process
- [x] 1.4 Create the app shell: role-gated layout, navigation per role, Spanish copy conventions
- [x] 1.5 Implement shared loading/empty/error state components

## 2. Auth (ui-auth)

- [x] 2.1 Implement `lib/api.ts` typed fetch wrapper (base URL, Bearer header, `{ message }` error parsing, 401 → `/login`)
- [x] 2.2 Implement session route handlers: login proxy setting httpOnly cookie, logout clearing it
- [x] 2.3 Build `/login` page (validation, pending state, backend error display)
- [x] 2.4 Add auth guard + role redirect for protected routes; role-based default home

## 3. Catalog (ui-catalog)

- [x] 3.1 Product list with search and category/active filters
- [x] 3.2 Product create form (decimal-string prices, category select, uniqueness error handling)
- [x] 3.3 Product detail/edit page at `/products/[id]`
- [x] 3.4 Deactivate flow with Error-colored confirmation dialog
- [x] 3.5 Category list + create (Admin only) with deterministic pastel badges

## 4. Inventory (ui-inventory)

- [x] 4.1 Stock view per product with low-stock Warning highlight
- [x] 4.2 Initialize-stock form (`quantity ≥ 0`, reason)
- [x] 4.3 Adjustment form with mandatory reason and entrada/salida delta UX

## 5. POS (ui-pos)

- [x] 5.1 POS layout with always-focused scan input and focus-return behavior
- [x] 5.2 Barcode lookup → cart add/increment; inline errors for unknown/inactive products
- [x] 5.3 Cart editing (quantity, remove) with integer-cents total helper
- [x] 5.4 Payment method selection and confirm gating
- [x] 5.5 Create + confirm sale flow with atomic-failure and network-unknown handling (backend currently 501 — verify contract before wiring)

## 6. Reports (ui-reports)

- [x] 6.1 Sales summary view with date-range selector
- [x] 6.2 Top products view
- [x] 6.3 Stock movement history view with product filter
- [x] 6.4 Admin-only gating for `/reports`

## 7. Quality pass

- [x] 7.1 Responsive + keyboard-focus + reduced-motion audit across screens
- [x] 7.2 Verify all copy is Spanish, consistent action naming, only design-system colors used
