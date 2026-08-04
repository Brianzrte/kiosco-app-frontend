## 1. Money normalization

- [ ] 1.1 Add pure parse/format helpers in `src/lib/money.ts` for canonical
      decimal strings and localized editing input; cover integers, one/two
      decimals, comma, thousands, empty and invalid values with Vitest.

## 2. Shared primitive

- [ ] 2.1 Add `MoneyInput` to `src/components/ui/`, reusing Input labels,
      errors, focus and token-bound styles; inspect that it returns canonical
      decimal strings and accepts keyboard paste/editing.
- [ ] 2.2 Verify manually at 320 px and desktop: symbol, long amount, error,
      focus, keyboard and mobile numeric keyboard do not overflow or trap focus.

## 3. Migration

- [ ] 3.1 Inventory and migrate price/cost/amount fields in catalog, POS,
      purchases, receiving and cash closing; exclude weights, quantities and
      percentages by inspection.
- [ ] 3.2 Verify each migrated submit still sends the canonical decimal string
      via existing `api<T>()` calls; no endpoint or backend change is required.

## 4. Verification

- [ ] 4.1 Run `npm test`, `npm run lint` and `npm run build`.
- [ ] 4.2 Manually test typing, deleting and pasting `20000`, `20000.0`,
      `20000,5` and `20.000,50` in every migrated surface.
- [ ] 4.3 Run UX/UI pre-merge review. Do not sync, archive or commit without
      the explicit closing workflow.
