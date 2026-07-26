# Tasks: add-frontend-mvp

## 1. Scaffold & Foundation (ui-foundation)

- [ ] 1.1 Scaffold Next.js app (App Router, TypeScript, Tailwind) in `frontend/`
- [ ] 1.2 Map the CLAUDE.md design tokens into the Tailwind theme (colors, 12px radius, soft shadows) and global styles
- [ ] 1.3 Build the UI kit: Button, Input, Card, Badge, Table, Dialog, Toast — following the frontend-design skill process
- [ ] 1.4 Create the app shell: role-gated layout, navigation per role, Spanish copy conventions
- [ ] 1.5 Implement shared loading/empty/error state components

## 2. Auth (ui-auth)

- [ ] 2.1 Implement `lib/api.ts` typed fetch wrapper (base URL, Bearer header, `{ message }` error parsing, 401 → `/login`)
- [ ] 2.2 Implement session route handlers: login proxy setting httpOnly cookie, logout clearing it
- [ ] 2.3 Build `/login` page (validation, pending state, backend error display)
- [ ] 2.4 Add auth guard + role redirect for protected routes; role-based default home

## 3. Catalog (ui-catalog)

- [ ] 3.1 Product list with search and category/active filters
- [ ] 3.2 Product create form (decimal-string prices, category select, uniqueness error handling)
- [ ] 3.3 Product detail/edit page at `/products/[id]`
- [ ] 3.4 Deactivate flow with Error-colored confirmation dialog
- [ ] 3.5 Category list + create (Admin only) with deterministic pastel badges

## 4. Inventory (ui-inventory)

- [ ] 4.1 Stock view per product with low-stock Warning highlight
- [ ] 4.2 Initialize-stock form (`quantity ≥ 0`, reason)
- [ ] 4.3 Adjustment form with mandatory reason and entrada/salida delta UX

## 5. POS (ui-pos)

- [ ] 5.1 POS layout with always-focused scan input and focus-return behavior
- [ ] 5.2 Barcode lookup → cart add/increment; inline errors for unknown/inactive products
- [ ] 5.3 Cart editing (quantity, remove) with integer-cents total helper
- [ ] 5.4 Payment method selection and confirm gating
- [ ] 5.5 Create + confirm sale flow with atomic-failure and network-unknown handling (backend currently 501 — verify contract before wiring)

## 6. Reports (ui-reports)

- [ ] 6.1 Sales summary view with date-range selector
- [ ] 6.2 Top products view
- [ ] 6.3 Stock movement history view with product filter
- [ ] 6.4 Admin-only gating for `/reports`

## 7. Quality pass

- [ ] 7.1 Responsive + keyboard-focus + reduced-motion audit across screens
- [ ] 7.2 Verify all copy is Spanish, consistent action naming, only design-system colors used
