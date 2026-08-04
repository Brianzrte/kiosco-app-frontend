## 1. Quitar el atajo de la confirmación de venta

- [x] 1.1 En `ConfirmedSalePanel.tsx`, quitar el botón "Inicializar stock" y su condición (`canInitializeStockFromPos(roles) && confirmedSale?.productId`); dejar sólo "Nueva venta" (texto restaurado de antes de `add-frontend-success-stock-popups`, siempre variante `primary`) y "Ver detalle"; inspección de código.
- [x] 1.2 Quitar la prop `roles` de `ConfirmedSalePanel` si queda sin otro uso tras 1.1; inspección de código.
- [x] 1.3 En `PosView.tsx`, quitar `productId` de `confirmedSale`/`setConfirmedSale` y la prop `roles` pasada a `ConfirmedSalePanel` si queda sin otro consumidor; inspección de código. También se quitó `PosView({ roles })` y `session.roles` en `src/app/(app)/page.tsx`, sin otro consumidor tras 1.1-1.3.
- [x] 1.4 Quitar `canInitializeStockFromPos` de `src/lib/products.ts` y `getLastCartLineProductId` si queda sin otro consumidor; verificar con `grep` antes de borrar. Confirmado por `grep` que no tenían otros consumidores.
- [x] 1.5 Actualizar/quitar los tests correspondientes en `src/lib/products.test.ts`.
- [x] 1.6 `npm run lint`, `npm test`, `npm run build`; los tres pasaron sin errores (198 tests, build OK).
