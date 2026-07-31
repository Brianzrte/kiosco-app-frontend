## 1. POS entry density

- [x] 1.1 Compact the scan input in `PosView` to an operational 44–52px height with at least 16px text, preserving scan-first focus, barcode Enter handling, icon meaning, and design tokens; verified by code inspection and Chrome DevTools measurement (48px at tested widths).
- [x] 1.2 Compose scan and manual search side-by-side at the breakpoint where both fit, with scan visually dominant and stacked fields below that breakpoint; verified at 1024×768, 1280×720, 1366×768, 844×390, and 320×568.
- [ ] 1.3 Verify search loading, empty, error, keyboard navigation, and focus return behavior after the density change; manual evidence from Chrome DevTools.

## 2. Cart row density and responsive behavior

- [x] 2.1 Refactor unit-based cart rows to a stable responsive grid that keeps product, quantity, subtotal, and remove aligned without accidental desktop wrapping; preserve weighted-product editing and existing cart math; verified by code inspection.
- [x] 2.2 Preserve minimum 44×44px interactive targets, visible focus, accessible names, flash feedback, stable line order, and total updates for quantity/remove controls; verified by code inspection and Chrome accessibility snapshots.
- [x] 2.3 Verify three unit-based rows at 1366×768 and mixed/long product content at 1024×768, 844×390, and 320×568, including no document horizontal overflow; recorded Chrome DevTools measurements (60px desktop rows; 120px at 320px; no overflow).
- [ ] 2.4 Verify the mobile fixed total and `Confirmar venta` bar remains reachable with cart content and is not obscured by the resized rows or virtual keyboard; manual evidence at 844×390 and 320×568.

## 3. Header overflow

- [x] 3.1 Adjust `Nav` spacing/presentation so all authorized navigation items, role indicator, and sign-out control remain directly reachable without document or header overflow from 768px upward; preserve role union, active route, accessible names, and mobile drawer/bottom navigation behavior; verified by code inspection and admin Chrome snapshot at 1366px.
- [ ] 3.2 Manually validate authenticated admin and a non-admin role at 768×1024, 1024×768, 1280×720, 1366×768, and 1440×900; verify `document.documentElement.scrollWidth === innerWidth` and direct keyboard reachability.

## 4. Verification

- [x] 4.1 Run `npm run lint` and resolve any findings caused by the implementation; passed.
- [x] 4.2 Run `npm test`; no component-test dependency or new test runner may be added; 16 files and 132 tests passed.
- [x] 4.3 Run the Chrome DevTools MCP responsive checklist for POS at 320×568, 360×800, 390×844, 414×896, 430×932, 844×390, 768×1024, 1024×768, 1280×720, and 1366×768; all listed viewports were opened and measured, with no horizontal overflow.
- [ ] 4.4 Perform a final UX/UI audit focused on density, focus, keyboard, accessible names, reduced motion, no horizontal overflow, and preservation of total/payment hierarchy.

## 5. Closure

- [ ] 5.1 Leave all tasks unmarked until implementation evidence exists; synchronize specs and archive only through the change-closer workflow after explicit user approval.
