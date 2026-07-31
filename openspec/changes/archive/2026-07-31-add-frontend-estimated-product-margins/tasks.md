## 1. Backend contract prerequisite

- [x] 1.1 Confirmed against merged backend commit `b301470` on `develop`/`origin/develop` that `GET /api/v1/reports/products` returns `margin_estimated` as a boolean; inspection of router, query row, and response DTO.

## 2. Product report data and indicator

- [x] 2.1 Add `margin_estimated: boolean` to the product-row response type in `ProductsReportView.tsx` and consume it without changing existing report query parameters or monetary calculations; type/build verification passed.
- [x] 2.2 In the desktop Margen cell, render a visible `Margen estimado` Badge plus the approved explanation for rows where `margin_estimated === true`, and render no indicator for false rows; code inspection confirms conditional rendering, visible text, `aria-label`, and `sr-only` explanation.
- [x] 2.3 Include the margin and the same conditional indicator in the mobile product card, preserving usability at 320 px without horizontal overflow; responsive manual review confirmed manually by the requester.

## 3. Validation

- [x] 3.1 Run `npm test` — 16 test files and 132 tests passed.
- [x] 3.2 Run `npm run lint` — passed.
- [x] 3.3 Run `npm run build` because the response type and client view changed — passed.
- [x] 3.4 Run `git diff --check` and inspect the scoped diff; verify `sales/by-product` and category filtering were not modified — passed; only `ProductsReportView.tsx` and this change's OpenSpec artifacts are touched.
- [x] 3.5 Manually verify loading, empty, error, exact-margin, estimated-margin, keyboard/accessibility, and 320 px behavior against the real products report response; confirmed manually by the requester.
