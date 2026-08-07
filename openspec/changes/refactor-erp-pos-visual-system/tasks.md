## 1. Design approval and shared foundation

- [x] 1.1 Review the three mockups in `design.md` with the product owner and record any approved visual adjustment before implementation. Evidence: product owner approved mockups A, B and C without changes in the change discussion on 2026-08-07.
- [ ] 1.2 Extend `globals.css` only with tokenized workspace, surface, typography and layout values required by the approved direction. Evidence: code inspection confirms no literal colours, radii, shadows or motion durations in consuming views.
- [ ] 1.3 Extend shared UI primitives for the approved rail/workspace, administrative toolbar, KPI and table variants rather than restyling repeated screen markup. Evidence: code inspection of `src/components/ui/` and consumers.
- [ ] 1.4 Preserve or extend shared loading skeletons so their geometry follows the final administrative layout. Evidence: manual loading-state review at desktop and mobile widths.
- [ ] 1.5 Add a shared route-transition loading indicator (spinner/progress layer) that preserves shell geometry, announces pending navigation accessibly, and respects reduced motion. Evidence: code inspection plus manual navigation checks at 320px, 390px and desktop widths.

## 2. Navigation and responsive shell

- [ ] 2.1 Refactor the authenticated shell and `Nav` into the approved desktop rail/workspace while preserving `navItemsFor`, role union, active route semantics and logout behavior. Evidence: code inspection plus manual checks as cashier, inventory, receiving and admin.
- [ ] 2.2 Keep the existing mobile drawer/bottom-navigation behavior operational below 768px and preserve dialog focus return. Evidence: manual keyboard test at 390px and 768px boundary.
- [ ] 2.3 Verify desktop/tablet widths 768, 1024, 1280, 1366 and 1440px have no horizontal document overflow and every authorized navigation item is directly reachable. Evidence: manual viewport inspection.

## 3. POS operational composition

- [ ] 3.1 Refactor `PosView` composition to the approved scan/main/checkout regions using shared primitives, without changing cart, payment or sale API logic. Evidence: code inspection confirms existing endpoint flow remains unchanged.
- [ ] 3.2 Manually verify scan input focus on load, after known/unknown scan, after dialog close and after sale confirmation in the refactored POS. Evidence: keyboard/reader-path checklist.
- [ ] 3.3 Manually verify POS at desktop and 390px: scan input, cart total, payment balance, confirmation feedback and recovery are reachable without horizontal page overflow. Evidence: responsive checklist.

## 4. Administrative workspaces

- [ ] 4.1 Refactor catalog, categories and inventory headers, filters, summaries and dominant data regions through approved shared primitives. Evidence: manual loading/empty/error/success review and existing filters/actions still work.
- [ ] 4.2 Refactor sales, sale detail and returns using the administrative hierarchy while preserving labelled payment, status and return information. Evidence: manual history/detail/return workflow check.
- [ ] 4.3 Refactor reports dashboard and detail reports so period/filter context precedes existing aggregates and charts retain their data palette. Evidence: manual report comparison at desktop and mobile widths.
- [ ] 4.4 Refactor receiving and user-management stable views using the shared hierarchy without changing their role gates or dialogs. Evidence: manual authorized/forbidden and keyboard-dialog checks.
- [ ] 4.5 Coordinate presentation integration for the open purchasing and cashier-shift-closing changes with their owners; do not overwrite their OpenSpec artifacts or unapproved code. Evidence: review of the resulting consumer views once their owners make them available.

## 5. Accessibility, states and motion

- [ ] 5.1 Inspect every refactored interactive control for visible focus, accessible name, semantic labels, non-colour status cues and text contrast. Evidence: manual keyboard and browser accessibility-tree review.
- [ ] 5.2 Manually test loading, empty, error, pending and success states in POS plus one representative screen from each administrative family. Evidence: state checklist with expected recovery copy.
- [ ] 5.3 Verify `prefers-reduced-motion` removes displacement/scale, all new motion uses existing tokens and POS feedback does not delay scanning. Evidence: code inspection and manual reduced-motion test.
- [ ] 5.4 Verify the route-transition indicator appears on navigation, remains visually stable without layout shift, and clears after the destination is ready; confirm it does not interfere with POS scan focus or in-page pending states. Evidence: manual route navigation and accessibility-state review.

## 6. Verification and handoff

- [ ] 6.1 Run `npm run lint` and resolve refactor findings. Evidence: successful command output.
- [ ] 6.2 Run `npm test` and add/adjust only Node-compatible `lib/*.test.ts` coverage if a pure helper changes. Evidence: successful command output.
- [ ] 6.3 Run `npm run build` because app layout, routes and shared types/primitives may change. Evidence: successful command output.
- [ ] 6.4 Perform final UX/UI reviewer `pre-merge` review against the approved mockups and this change's requirements. Evidence: PASS or PASS WITH OBSERVATIONS report with no unresolved blocker.
- [ ] 6.5 After implementation and verification, synchronize specs, archive and commit only through the change-closer workflow and only with explicit user approval. Evidence: closer report; do not perform this task automatically.
