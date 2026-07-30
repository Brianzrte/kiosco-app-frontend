## 0. Prerrequisitos

- [ ] 0.1 Confirmar que `add-frontend-suppliers-purchasing` sigue sin archivar y que `PurchaseOrderForm.tsx` y `ProductSuppliersPanel.tsx` conservan la forma descripta en este change (mismo grid de ítem, mismo patrón `GET`+`PUT` de asociación); inspección de código, sin llamada a backend.
- [ ] 0.2 Confirmar contra el router y DTOs de backend que `GET /purchase-orders/suggestions`, `GET /products/{id}/suppliers` y `PUT /products/{id}/suppliers` no cambiaron de contrato desde la verificación registrada en `add-frontend-suppliers-purchasing`; inspección de `../backend/internal/purchasing/transport/http/dto.go` y `router.go`, sin escritura contra backend real.

## 1. Helpers puros

- [ ] 1.1 Agregar a `src/lib/purchasing.ts` una función pura que divida un array de `ReplenishmentSuggestion` en `{ lowStock, incompleteData }` según `suggested_quantity` positivo o nulo; prueba automatizada en `src/lib/purchasing.test.ts` con casos: mezcla, todas bajas de stock, todas con datos incompletos y array vacío.
- [ ] 1.2 Agregar a `src/lib/purchasing.ts` una función pura `hasSupplierAssociation` que reciba una lista de `ProductSupplier` y un `supplierId`, y determine si existe alguna asociación activa (preferida o no) con ese proveedor; prueba automatizada con casos: lista vacía, asociado preferido, asociado no preferido, no asociado.
- [ ] 1.3 Agregar a `src/lib/purchasing.ts` una función pura `appendSupplierAssociation` que reciba la lista vigente de `ProductSupplier` y un `supplierId`, y devuelva el payload completo de `PUT /products/{id}/suppliers` agregando la nueva asociación (`preferred: false`, sin `replenishment_frequency_days`) sin remover las existentes; prueba automatizada con casos: lista vacía, lista con otras asociaciones ya preferidas/no preferidas.

## 2. Sugerencias en dos secciones

- [ ] 2.1 En `PurchaseOrderForm.tsx`, cuando no hay proveedor seleccionado, usar la función de 1.1 para renderizar dos bloques con encabezado ("Bajos de stock" / "Datos de planificación incompletos"), conservando la acción "Usar N" sólo en el bloque de bajo stock; inspección de que no se duplica el fetch de sugerencias.
- [ ] 2.2 Agregar el texto de vacío propio de cada bloque ("No hay productos bajos de stock en este momento." / "No hay productos con datos de planificación incompletos."); prueba manual: un bloque vacío y el otro con ítems, ambos vacíos, ambos con ítems.
- [ ] 2.3 Verificar accesibilidad de los dos bloques: encabezados de texto (`h3`/`p`), sin depender sólo de separación visual; prueba manual con lector de pantalla o inspección de estructura semántica.

## 3. Warning y asociación inline por ítem

- [ ] 3.1 En `PurchaseOrderForm.tsx`, cuando hay proveedor seleccionado, disparar un chequeo de asociación (`GET /products/{id}/suppliers` + `hasSupplierAssociation` de 1.2) al elegir o cambiar el producto de un ítem; inspección de que el chequeo no se dispara sin proveedor seleccionado.
- [ ] 3.2 Modelar el estado de chequeo por ítem (verificando / sin asociación / asociado) para no mostrar ni warning ni su ausencia mientras la consulta está en vuelo; prueba manual: no hay parpadeo de warning falso al elegir producto.
- [ ] 3.3 Mostrar el warning inline "El producto seleccionado no está asociado a este proveedor, ¿desea asociarlo?" con el botón "Asociar producto al proveedor" en el ítem cuando el chequeo determina que no hay asociación; prueba manual: producto sin ninguna asociación y producto asociado sólo no-preferido no muestran/muestran el warning correctamente.
- [ ] 3.4 Implementar la acción del botón: releer asociaciones (`GET`), construir el payload con `appendSupplierAssociation` de 1.3 y enviar `PUT /products/{id}/suppliers`; al éxito, ocultar el warning de ese ítem, mostrar un toast de confirmación y no recargar el formulario ni perder otros ítems/cantidades/costos; prueba manual contra backend real.
- [ ] 3.5 Manejar el error de `GET` (chequeo) y de `PUT` (alta) de forma inline y acotada al ítem, con reintento en el chequeo y mensaje de `ApiError` en el alta, sin invalidar el resto del formulario; prueba manual forzando ambos fallos.
- [ ] 3.6 Verificar que cambiar el producto de un ítem varias veces antes de enviar descarta el resultado de chequeo anterior de ese ítem y no deja un warning obsoleto; prueba manual con selección repetida de productos distintos en el mismo ítem.
- [ ] 3.7 Verificar teclado y foco: el warning y su botón están en el orden de tabulación del ítem existente; al confirmar la asociación, el foco permanece en el control del ítem (deshabilitado u oculto tras el éxito) sin saltos de foco inesperados; prueba manual con teclado.
- [ ] 3.8 Verificar responsive: el warning y el botón caben en el layout de ítem existente (`grid` en escritorio, una columna en mobile) sin overflow horizontal; prueba manual a ancho mobile y desktop.

## 4. Verificación y entrega

- [ ] 4.1 Ejecutar `npm run lint` y `npm test`; corregir fallos vinculados a este change.
- [ ] 4.2 Ejecutar `npm run build` si el cambio de tipos o de `purchasing.ts` lo requiere; corregir errores de tipos vinculados a este change.
- [ ] 4.3 Realizar verificación manual integral en `/purchasing/new`: dos secciones de sugerencias con y sin proveedor seleccionado, warning de asociación en sus variantes (sin asociación, con asociación no preferida, con asociación preferida), éxito y error de alta, teclado/foco y responsive.
- [ ] 4.4 Validar el change contra backend real (contratos ya desplegados, sin coordinación pendiente) y actualizar `ai/context/` descriptivo sólo cuando el comportamiento esté implementado y verificado.
- [ ] 4.5 Con decisión explícita del usuario, sincronizar el delta de spec sobre `ui-suppliers-purchasing` y archivar el change después de implementación y verificación completas.
