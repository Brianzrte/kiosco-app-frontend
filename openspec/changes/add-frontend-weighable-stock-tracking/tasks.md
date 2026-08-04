## 0. Prerrequisito bloqueante (backend)

- [ ] 0.1 Backend real: confirmar que `backend-request.md` está resuelto y
      desplegado en el ambiente de destino — `product_stock.quantity`/
      `minimum_quantity` y los campos de `stock_movements` aceptan decimal,
      los DTOs de `POST /inventory/stock`, `.../adjust` y
      `PATCH .../minimum` aceptan/devuelven decimal, `StockCheckItem`
      soporta decimal, y `ConfirmSaleUseCase` ya no salta las líneas
      `pesable` al verificar/descontar stock. Ninguna tarea de las
      secciones 1 en adelante puede empezar antes de esto.

## 1. Helper puro de validación de stock en kg (`src/lib/`)

- [ ] 1.1 Agregar a `src/lib/inventory.ts` (o extender
      `src/lib/weightPricing.ts` si el equipo prefiere mantener la
      validación de peso en un único módulo) una función que valide una
      cantidad de stock en kg reutilizando `isValidWeight` de
      `weightPricing.ts` — sin duplicar la regex de 3 decimales.
- [ ] 1.2 Agregar una función pura `stockLimitMessageKg(productName: string,
      availableKg: string): string` análoga a `stockLimitMessage` de
      `PosView.tsx`, pero para peso (ej. `"Sólo hay 2.300 kg disponibles de
      "{nombre}"."`).
- [ ] 1.3 (Prueba automatizada) Tests en `src/lib/inventory.test.ts` (o
      `weightPricing.test.ts` si se extiende ahí) para la validación de
      cantidad decimal: casos válidos con 1, 2 y 3 decimales; inválidos con
      más de 3 decimales, negativos, cero (para inicialización/ajuste, `0`
      es un valor legítimo — sólo el peso del carrito de venta exige > 0;
      confirmar cuál regla aplica a cada caso antes de escribir el test) y
      no numéricos.
- [ ] 1.4 (Prueba automatizada) Test para `stockLimitMessageKg`: mensaje con
      disponible `0`, con un valor entero, y con un valor decimal.

## 2. `InventoryView` — diálogo de inicialización y ajuste en kg

- [ ] 2.1 En el diálogo de inicialización, cuando el producto es `pesable`,
      reemplazar el input `inputMode="numeric"` + `parseInt(quantity, 10)`
      por un input validado con el helper de la tarea 1.1, enviando el valor
      como string decimal (no como `int`) en el body de
      `POST /inventory/stock`.
- [ ] 2.2 Mismo cambio para el diálogo de ajuste (entrada/salida): el
      `quantity_delta` enviado a `POST /inventory/stock/{product_id}/adjust`
      es decimal para `pesable`, entero para `unitario` (sin cambios en ese
      caso).
- [ ] 2.3 Mismo cambio para el formulario de mínimo: `minimum_quantity`
      enviado a `PATCH /inventory/stock/{product_id}/minimum` es decimal
      para `pesable`.
- [ ] 2.4 Actualizar el texto de ayuda de cada diálogo para aclarar la
      unidad (kg) cuando el producto es `pesable`, siguiendo el mismo lugar
      donde ya se explica que "0 desactiva la alerta" en el mínimo.
- [ ] 2.5 Confirmar por inspección que ningún cambio afecta el flujo de
      `unitario`: mismo `parseInt`, mismo `inputMode="numeric"`, mismo
      payload entero.

## 3. `InventoryView` — listado, tarjetas y movimientos en kg

- [ ] 3.1 En la tabla de escritorio y las tarjetas móviles del listado de
      stock, formatear `quantity`/`minimum_quantity` con hasta 3 decimales
      cuando el producto es `pesable`, sin cambiar el formato para
      `unitario`.
- [ ] 3.2 En el panel de movimientos, formatear
      `previous_quantity`/`new_quantity`/`quantity_delta` con hasta 3
      decimales para movimientos de un producto `pesable`.
- [ ] 3.3 Confirmar que "inicializado en cero" para un `pesable` se lee como
      `0.000`, no como "no inicializado" — mismo criterio ya vigente para
      `unitario` en `0`.

## 4. `PosView` — validación de stock para pesables

- [ ] 4.1 Extender `availableStock` (o la función que resuelva a la que
      hoy sólo usa `unitario`) para que también resuelva y cachee el stock
      disponible de un producto `pesable`, sin cambiar su comportamiento
      para `unitario`.
- [ ] 4.2 En `addToCart`/`beginWeightEntry`, antes de agregar una línea
      `pesable` nueva, consultar el disponible y bloquear con
      `stockLimitMessageKg` (tarea 1.2) si el peso pedido lo excede; si el
      disponible es `undefined` (sin registro de stock), no bloquear —
      mismo criterio que ya aplica a `unitario` con stock desconocido.
- [ ] 4.3 En `applyWeight`/`updateLineWeight` (edición del peso de una línea
      ya agregada), aplicar la misma validación al incrementar el peso.
- [ ] 4.4 Confirmar por inspección que el mensaje de bloqueo usa el mismo
      patrón textual visible (no sólo color) que ya usa `stockLimitMessage`
      para `unitario`.
- [ ] 4.5 Confirmar por inspección que ningún cambio afecta el flujo de
      `unitario`: mismas funciones, misma rama condicional por `unit_type`.

## 5. Verificación

- [ ] 5.1 `npm run lint`
- [ ] 5.2 `npm test`
- [ ] 5.3 `npm run build` (el change toca componentes compartidos; correr
      build para detectar errores de tipos no visibles en lint)
- [ ] 5.4 (Backend real) Confirmar contra el ambiente de destino que
      `POST /inventory/stock` con un `quantity` decimal para un producto
      `pesable` persiste el valor exacto, sin truncar.
- [ ] 5.5 (Backend real) Confirmar que un ajuste con `quantity_delta`
      decimal se aplica y que `GET /inventory/stock/{product_id}` devuelve
      el nuevo valor con sus decimales.
- [ ] 5.6 (Backend real) Confirmar que confirmar una venta con una línea
      `pesable` con peso descuenta ese peso del stock del producto
      (comparar `quantity` antes/después de confirmar).
- [ ] 5.7 (Prueba manual) Inicializar stock de un `pesable` en `/inventory`
      con un valor decimal (ej. `"12.500"`) y confirmar que el listado lo
      muestra con esa precisión.
- [ ] 5.8 (Prueba manual) Ajustar ese stock con un delta decimal negativo y
      positivo, con motivo, y confirmar que el listado y el historial
      reflejan el cambio con precisión decimal.
- [ ] 5.9 (Prueba manual) Intentar un ajuste que dejaría el stock negativo y
      confirmar que el backend lo rechaza y el mensaje se muestra.
- [ ] 5.10 (Prueba manual) Definir un mínimo decimal para un `pesable` y
      confirmar que el filtro de stock bajo lo respeta cuando corresponda.
- [ ] 5.11 (Prueba manual) En el POS, agregar un `pesable` con stock
      inicializado y pesar más de lo disponible: confirmar que se bloquea
      con el mensaje en kg y que no se agrega la línea.
- [ ] 5.12 (Prueba manual) En el POS, agregar un `pesable` **sin** stock
      inicializado y confirmar que la venta no se bloquea (mismo criterio
      que `unitario` con stock desconocido).
- [ ] 5.13 (Prueba manual) Confirmar una venta con una línea `pesable` con
      peso válido y verificar en `/inventory` que el stock del producto bajó
      exactamente ese peso.
- [ ] 5.14 (Prueba manual) Repetir las pruebas de stock para un producto
      `unitario` (inicializar, ajustar, vender) y confirmar que no hay
      ninguna regresión de comportamiento respecto de hoy.
- [ ] 5.15 (Prueba manual) Operar los diálogos de stock y el input de peso
      del POS sólo con teclado, confirmando que el foco se comporta igual
      que antes de este change.
- [ ] 5.16 (Prueba manual) Confirmar en 320px de ancho que ningún diálogo ni
      el carrito producen scroll horizontal ni recortan el layout existente.

## 6. Cierre (sujeto a decisión del usuario)

- [ ] 6.1 Sincronizar specs (`openspec archive` o equivalente) sólo cuando
      el usuario lo pida explícitamente después de implementar y verificar.
