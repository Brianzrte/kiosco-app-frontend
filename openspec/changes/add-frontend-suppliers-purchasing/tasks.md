## 0. Prerrequisitos y coordinación backend

- [ ] 0.1 Confirmar contra una instancia real que `add-frontend-user-roles-and-receiving` está desplegado, incluidos roles múltiples y `receiving`; evidencia: login, router y respuestas reales.
- [ ] 0.2 Confirmar en backend real los contratos de proveedores, asociaciones, sugerencias, pagos, reporte y recepción atómica de `backend-request.md`; evidencia: método, path, roles, shape, nullabilidad y status.
- [ ] 0.3 Verificar una recepción exitosa y una fallida contra backend real: la primera actualiza stock/movimientos y cierra el pedido; la segunda no persiste estado parcial.
- [x] 0.4 Documentado: Inventory no registra pagos; Admin y Cashier pueden registrar un único pago total por pedido recibido a cuenta corriente.

## 1. Tipos, helpers y navegación

- [ ] 1.1 Agregar a `src/lib/types.ts` los tipos de transporte verificados para proveedor, relación producto–proveedor, pedido, sugerencia, pago, saldo y reporte; inspección: dinero como `string` decimal y campos nullable reflejados.
- [ ] 1.2 Crear helpers puros para query strings, etiquetas y display shaping permitidos de proveedores/pedidos/reportes; prueba automatizada en `src/lib/*.test.ts` para filtros, bordes y ausencia de cálculo de negocio.
- [ ] 1.3 Agregar rutas autorizadas a `NAV_ITEMS` y gates `requireRole()` coordinados con roles múltiples; inspección: Cashier y Receiving-only no ven ni solicitan gestión de proveedores/pedidos.

## 2. Gestión de proveedores y relaciones

- [ ] 2.1 Crear páginas y views de listado/detalle/formulario de proveedores con alta, edición y desactivación lógica vía `api<T>()`; prueba manual: loading, vacío, error, éxito y preservación del formulario ante error.
- [ ] 2.2 Implementar asociación múltiple producto–proveedor y proveedor preferido usando sólo el contrato verificado; prueba manual: proveedor inactivo no elegible y producto sin preferido explicado.
- [ ] 2.3 Verificar accesibilidad y teclado de proveedores: foco visible, Enter en filas, diálogos con foco inicial/retorno y confirmación explícita de desactivación.

## 3. Pedidos y planificación

- [ ] 3.1 Crear listado, detalle y formulario de pedido manual para Admin/Inventory; inspección: total mostrado desde backend y montos mediante `formatMoney()`.
- [ ] 3.2 Implementar vista de sugerencias de reposición y revisión previa a crear pedido; prueba manual: sugerencia vacía, datos insuficientes y ajuste humano sin cálculo en cliente.
- [ ] 3.3 Verificar filtros, paginación y móvil en pedidos y sugerencias; prueba manual: acciones y datos principales accesibles a ancho móvil.

## 4. Recepción con stock y diferencias

- [ ] 4.1 Extender las views de `/receiving` y `/receiving/[id]` del change prerrequisito para capturar cantidades entregadas y mostrar la advertencia de cierre con movimientos de stock.
- [ ] 4.2 Integrar recepción, alta de ítem adicional y baja con motivo contra el contrato desplegado; prueba manual: éxito, `409`, error de stock, valores preservados y relectura autoritativa.
- [ ] 4.3 Inspeccionar que una recepción nunca actualiza cantidades ni totales optimistamente y que ítems faltantes/no catalogados siguen auditables.

## 5. Pagos, saldos y reportes

- [ ] 5.1 Implementar registro del único pago total pendiente por pedido para Admin/Cashier; prueba manual: pago completo, pago parcial rechazado, segundo pago rechazado y mensajes inline.
- [ ] 5.2 Ampliar `/reports/purchases` con el agregado de desempeño por proveedor; inspección: Admin-only, rangos `YYYY-MM-DD`, `formatMoney()` y ninguna reagrupación desde filas paginadas.
- [ ] 5.3 Verificar loading, vacío, error, reintento y responsive de pagos y reporte; prueba manual: estado no comunicado sólo por color.

## 6. Verificación y entrega

- [ ] 6.1 Ejecutar `npm run lint` y `npm test`; corregir fallos vinculados a este change.
- [ ] 6.2 Ejecutar `npm run build` por cambios en tipos y `page.tsx`; corregir errores de tipos vinculados a este change.
- [ ] 6.3 Realizar verificación manual integral de gates, navegación, teclado/foco, diálogos, móvil, accesibilidad, errores backend y flujos de proveedor, pedido, pago y recepción.
- [ ] 6.4 Validar el change contra backend real y actualizar `ai/context/` descriptivo sólo cuando el comportamiento esté implementado y verificado.
- [ ] 6.5 Con decisión explícita del usuario, sincronizar los deltas de spec y archivar el change después de implementación y verificación completas.
