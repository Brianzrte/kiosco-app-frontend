## 0. Prerrequisitos y coordinación backend

- [x] 0.1 Confirmar contra una instancia real que `add-frontend-user-roles-and-receiving` está desplegado, incluidos roles múltiples y `receiving`; evidencia: login de desarrollo en `localhost:8082` devolvió `cashier` + `receiving`; `/health` y `GET /suppliers` autenticado respondieron correctamente.
- [x] 0.2 Confirmar en backend real los contratos de proveedores, asociaciones, sugerencias, pagos, reporte y recepción atómica de `backend-request.md`; evidencia: instancia `localhost:8082` con Admin devolvió los shapes de proveedores, pedidos, sugerencias y reporte; el usuario `cashier` + `receiving` recibió `403` en sugerencias y reporte. Métodos, nullabilidad y estados se contrastaron con router y DTOs de backend.
- [x] 0.3 Verificar una recepción exitosa y una fallida contra backend real: la primera actualiza stock/movimientos y cierra el pedido; la segunda no persiste estado parcial. Evidencia: `go test ./tests/integration -run 'TestReceivePurchaseOrder(HappyPathAndAlreadyReceivedRejected|RollsBackWhenInventoryFails)$' -count=1` pasó.
- [x] 0.4 Documentado: Inventory no registra pagos; Admin y Cashier pueden registrar un único pago total por pedido recibido a cuenta corriente.

## 1. Tipos, helpers y navegación

- [x] 1.1 Agregar a `src/lib/types.ts` los tipos de transporte verificados para proveedor, relación producto–proveedor, pedido, sugerencia, pago único y reporte; inspección: dinero como `string` decimal y campos nullable reflejados.
- [x] 1.2 Crear helpers puros para query strings, etiquetas y display shaping permitidos de proveedores/pedidos/reportes; prueba automatizada en `src/lib/*.test.ts` para filtros, bordes y ausencia de cálculo de negocio. Evidencia: `src/lib/purchasing.test.ts` (5 casos) pasó.
- [x] 1.3 Reemplazar las entradas separadas por la navegación canónica `/purchasing` para Admin, Inventory y Receiving; agregar gates de roles múltiples y redirecciones de `/receiving` y `/suppliers`; inspección: Cashier no ve ni solicita compras, Receiving-only ve pendientes/historial/recepción pero no creación ni gestión de proveedores. Evidencia: `src/lib/nav.test.ts` (3 casos), `npm run lint` y `npm run build` pasaron.

## 2. Hub de compras y recepción

- [ ] 2.1 Crear `/purchasing` como dashboard de pedidos pendientes con grilla 4/5–1/5 en escritorio y apilado en móvil; usar `status=PENDING`, filtros de proveedor/fechas, paginación y link al detalle; prueba manual: carga, vacío real, vacío por filtros, error, contador anunciado y navegación con teclado.
- [x] 2.2 Implementar el panel lateral de acciones con una sola jerarquía primaria por región: Admin/Inventory ven Crear pedido, Historial de pedidos y Lista de proveedores; Receiving-only no ve las acciones de escritura; inspección: los botones ausentes tampoco disparan requests protegidos. Evidencia: gate por `hasAnyRole`, `npm test` (84 casos), `npm run lint` y `npm run build` pasaron.
- [ ] 2.3 Crear `/purchasing/history` con tabla paginada, filtros por proveedor, fechas y estados `Todos`/`Pendiente`/`Recibido`, y columnas proveedor, estado, fecha, recibido por y costo; prueba manual: filtros reinician página, moneda/fechas formateadas, filas activables por teclado y responsive.
- [x] 2.4 Llevar el detalle compartido de pedido a la ruta canónica y mostrar auditoría por ítem desde campos del backend: cantidades solicitada/recibida, motivo de no entrega, ítem de texto libre pendiente de alta e ítem eliminado con motivo; inspección: no se inventa un campo de estado ni se filtra localmente un historial paginado. Evidencia: rutas canónicas y redirecciones inspeccionadas; `npm test` (84 casos), `npm run lint` y `npm run build` pasaron.

## 3. Gestión de proveedores y relaciones

- [ ] 3.1 Mover la lista/formulario de proveedores a `/purchasing/suppliers`, conservando alta, edición y desactivación lógica vía `api<T>()`; prueba manual: loading, vacío, error, éxito y preservación del formulario ante error.
- [ ] 3.2 Mantener la lista grande de proveedores en un contenedor vertical desplazable y filtros de nombre locales claramente etiquetados; prueba manual: la página no crece sin límite, el foco alcanza filas y acciones, y el vacío de búsqueda se diferencia del vacío real.
- [ ] 3.3 Implementar asociación múltiple producto–proveedor y proveedor preferido usando sólo el contrato verificado; prueba manual: proveedor inactivo no elegible y producto sin preferido explicado.
- [ ] 3.4 Verificar accesibilidad y teclado de proveedores: foco visible, Enter en filas, diálogos con foco inicial/retorno y confirmación explícita de desactivación.

## 4. Pedidos y planificación

- [x] 4.1 Crear `/purchasing/new` con formulario de pedido manual para Admin/Inventory; inspección: total mostrado desde backend y montos mediante `formatMoney()`. Evidencia: `PurchaseOrderForm` no calcula total y navega al pedido autoritativo devuelto; `npm test` (84 casos), `npm run lint` y `npm run build` pasaron.
- [ ] 4.2 Implementar vista de sugerencias de reposición y revisión previa a crear pedido; prueba manual: sugerencia vacía, datos insuficientes y ajuste humano sin cálculo en cliente.
- [ ] 4.3 Verificar filtros, paginación y móvil en pedidos y sugerencias; prueba manual: acciones y datos principales accesibles a ancho móvil.

## 5. Recepción con stock y diferencias

- [x] 5.1 Extender las views del detalle canónico del pedido para capturar cantidades entregadas y mostrar la advertencia de cierre con movimientos de stock. Evidencia: `ReceivingDetailView` captura cada ítem activo, exige cantidades válidas y anuncia el registro de cantidades, movimientos y cierre; `npm test` (88 casos), `npm run lint` y `npm run build` pasaron.
- [ ] 5.2 Integrar recepción, alta de ítem adicional y baja con motivo contra el contrato desplegado; prueba manual: éxito, `409`, error de stock, valores preservados y relectura autoritativa.
- [x] 5.3 Inspeccionar que una recepción nunca actualiza cantidades ni totales optimistamente y que ítems faltantes/no catalogados siguen auditables. Evidencia: la mutación espera `api()` y luego llama `reload()`; el detalle muestra cantidad solicitada/recibida, motivo de diferencia, pendiente de alta y eliminación con motivo.

## 6. Pagos y reportes

- [ ] 6.1 Implementar registro del único pago total pendiente por pedido para Admin/Cashier; prueba manual: pago completo, pago parcial rechazado, segundo pago rechazado y mensajes inline.
- [ ] 6.2 Ampliar `/reports/purchases` con el agregado de desempeño por proveedor; inspección: Admin-only, rangos `YYYY-MM-DD`, `formatMoney()` y ninguna reagrupación desde filas paginadas.
- [ ] 6.3 Verificar loading, vacío, error, reintento y responsive de pagos y reporte; prueba manual: estado no comunicado sólo por color.

## 7. Verificación y entrega

- [ ] 7.1 Ejecutar `npm run lint` y `npm test`; corregir fallos vinculados a este change.
- [ ] 7.2 Ejecutar `npm run build` por cambios en tipos y `page.tsx`; corregir errores de tipos vinculados a este change.
- [ ] 7.3 Realizar verificación manual integral de gates, navegación, teclado/foco, diálogos, móvil, accesibilidad, errores backend y flujos de proveedor, pedido, pago y recepción.
- [ ] 7.4 Validar el change contra backend real y actualizar `ai/context/` descriptivo sólo cuando el comportamiento esté implementado y verificado.
- [ ] 7.5 Con decisión explícita del usuario, sincronizar los deltas de spec y archivar el change después de implementación y verificación completas.
