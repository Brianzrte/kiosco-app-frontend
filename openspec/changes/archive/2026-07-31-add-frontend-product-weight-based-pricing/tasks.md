## 0. Prerrequisitos y coordinación

- [x] 0.1 Bloqueado por `backend-request.md`: verificar contra una instancia
      real (no contra el código) que `POST /api/v1/products` y
      `PUT /api/v1/products/{id}` acepten `unit_type` y, para `pesable`,
      `price_per_kg`, y que `GET /api/v1/products` los devuelva. No avanzar
      con la sección 1 hasta confirmar esto.
- [x] 0.2 Bloqueado por `backend-request.md`: verificar contra una instancia
      real que `POST /api/v1/sales/{id}/items` acepte una línea con peso
      decimal (3 decimales) y, opcionalmente, un precio real, y que
      `GET /api/v1/sales/{id}` devuelva tanto el precio calculado como el
      real para esa línea. No avanzar con las secciones 3-4 hasta confirmar
      esto.
- [x] 0.3 Confirmar con el backend los nombres definitivos de los campos
      nuevos (tipo de producto, precio por kilogramo, peso de línea, precio
      calculado, precio real) antes de fijar los tipos en `lib/types.ts`.
- [x] 0.4 Resolver el orden de merge con el change abierto
      `add-frontend-automatic-product-sku` sobre `ProductForm.tsx` (fusionar
      ese change primero, o resolver el conflicto de archivo al implementar
      este) — decisión del usuario, no una tarea de código.

## 1. Tipos

- [x] 1.1 Extender `Product` en `src/lib/types.ts` con el tipo de producto y
      `price_per_kg` (nombres confirmados en 0.3), preservando el shape
      actual para `unitario`.
- [x] 1.2 Extender `SaleItem`/línea de venta en `src/lib/types.ts` con el
      campo de peso decimal y los dos precios (calculado, real), como
      strings decimales — nunca `number` ni float.
- [x] 1.3 Actualizar el payload de `POST /sales/{id}/items` (tipo del body)
      para incluir peso y precio real cuando corresponda.

## 2. Helper puro de cálculo de precio por peso

- [x] 2.1 Implementar una función pura (`lib/money.ts` o un módulo dedicado)
      que calcule `peso × price_per_kg` redondeado a 2 decimales, operando
      en centavos enteros (mismo patrón que `toCents`/`fromCents`), sin
      floats.
- [x] 2.2 Implementar una función pura que determine el precio efectivo de
      una línea (real si existe, calculado si no), reutilizable tanto para
      el total del carrito como para el balance de pago.
- [x] 2.3 Agregar validación pura de un peso ingresado (positivo, ≤ 3
      decimales) reutilizable entre el control de peso del POS y cualquier
      otro punto que lo necesite.
- [x] 2.4 Test automatizado (`*.test.ts`, environment `node`) para 2.1, 2.2
      y 2.3: casos límite de redondeo a centavo, peso con 3 decimales exactos,
      peso inválido, y precedencia del precio real sobre el calculado.

## 3. `ProductForm` — alta/edición de producto

- [x] 3.1 Agregar el selector de tipo de producto (`unitario`/`pesable`),
      sin valor por defecto vacío; bloquear el envío del formulario hasta
      que se elija uno.
- [x] 3.2 Reemplazar el campo `price` por `price_per_kg` cuando el tipo es
      `pesable`, preservando `cost` sin cambios; restaurar `price` cuando el
      tipo vuelve a `unitario`.
- [x] 3.3 Enviar el tipo de producto y el campo de precio correspondiente en
      `POST /products` y `PUT /products/{id}`.
- [x] 3.4 Mostrar el error de validación del backend (p.ej. `price_per_kg`
      faltante) debajo del campo correspondiente, preservando el resto de
      los valores — mismo patrón que el resto del formulario.
- [x] 3.5 Para un producto existente cuya respuesta no incluye tipo de
      producto, tratarlo como `unitario` explícito al abrir el formulario de
      edición, sin mostrar un estado vacío ni un error.
- [x] 3.6 Prueba manual: alternar entre `unitario` y `pesable` con teclado,
      confirmar que el campo de precio correcto se muestra y que el envío
      falla de forma clara si falta.

## 4. `ProductsView` — listado de productos

- [x] 4.1 Mostrar `price_per_kg` con sufijo "/kg" en la columna de precio
      para un producto `pesable`, y `price` sin cambios para `unitario` (o
      para un producto sin tipo, tratado como `unitario`).
- [x] 4.2 Prueba manual: verificar la columna de precio en escritorio y en
      la vista de tarjetas móvil para ambos tipos de producto.

## 5. `PosView` — carrito con peso y precio real

- [x] 5.1 Extender el tipo de línea del carrito para representar, según el
      tipo de producto, cantidad entera o peso decimal, y un precio real
      opcional.
- [x] 5.2 Al escanear o buscar un producto `pesable`, abrir/enfocar su
      control de peso en vez de agregarlo directamente al carrito; no
      agregar ninguna línea hasta que el peso ingresado sea > 0.
- [x] 5.3 Al escanear de nuevo un producto `pesable` ya presente en el
      carrito, enfocar su control de peso existente para una nueva entrada,
      sin incrementar ningún valor ni crear una segunda línea (Decisión 8,
      `design.md`).
- [x] 5.4 Calcular y mostrar el precio de la línea `pesable` con el helper
      de la sección 2 apenas el peso es válido.
- [x] 5.5 Agregar el control de edición de precio real (botón con ícono
      lápiz y `aria-label` que nombra el producto), disponible sólo antes de
      confirmar la venta; `Enter` confirma, `Escape` cancela sin cambios.
- [x] 5.6 Usar el precio efectivo (helper 2.2) de cada línea para el total
      del carrito y para el balance de pago (corto/exacto/sobrante),
      reemplazando el cálculo actual que asume siempre `price × quantity`.
- [x] 5.7 No consultar ni cap-ear contra `GET /inventory/stock/{product_id}`
      para un producto `pesable`, en `addToCart`/`incrementQuantity` y
      cualquier punto equivalente; mantener la validación de stock sin
      cambios para `unitario`.
- [x] 5.8 Rechazar inline (sin llamar al backend) un peso negativo, no
      numérico o con más de 3 decimales, reutilizando el helper de la
      sección 2.
- [x] 5.9 Rechazar la incorporación de un producto `pesable` sin
      `price_per_kg` válido, con el mismo tratamiento visual que un producto
      inactivo hoy.
- [x] 5.10 Enviar, por cada línea `pesable`, su peso y — cuando exista — su
      precio real en `POST /sales/{id}/items`, en el mismo recorrido que hoy
      hace `confirmSale()` sobre `cart`.
- [x] 5.11 Verificar que el foco vuelve al input de escaneo después de
      abrir/cerrar el editor de precio real, igual que el resto de acciones
      del carrito (`refocus()`).
- [x] 5.12 Prueba manual: mezclar productos `unitario` y `pesable` en el
      mismo carrito; confirmar que el total, el balance de pago y la
      confirmación de venta son correctos para ambos tipos a la vez.
- [x] 5.13 Prueba manual de teclado: control de peso, editor de precio real
      (abrir, confirmar con Enter, cancelar con Escape), retorno de foco al
      escaneo en cada caso.
- [x] 5.14 Prueba manual de responsive: el control de peso y el botón lápiz
      operables desde 320px, sin depender de hover.
- [x] 5.15 Prueba manual de accesibilidad: `aria-label` del botón lápiz,
      foco visible en el control de peso y en el editor de precio real.

## 6. `SaleDetail` — precio calculado tachado

- [x] 6.1 Mostrar, para una línea con precio real distinto del calculado, el
      precio calculado tachado (`<s>`/`line-through`) en rojo junto al
      precio real, en la tabla de escritorio y en la vista de tarjetas
      móvil.
- [x] 6.2 Agregar un texto o `aria-label` que indique explícitamente "precio
      calculado, reemplazado por precio real" — el color no es el único
      canal.
- [x] 6.3 Mostrar el peso (kg) en vez de una cantidad entera para una línea
      `pesable`, en ambas vistas (tabla y tarjetas).
- [x] 6.4 Confirmar que una línea sin corrección (unitario, o pesable sin
      editar) sigue mostrando sólo el precio vigente, sin tachado — mismo
      comportamiento que hoy.
- [x] 6.5 Prueba manual: verificar el tachado y el peso en ambas vistas
      (escritorio/móvil), y que el total neto de la venta (con y sin
      devoluciones) sigue calculándose sobre el precio efectivo devuelto por
      el backend, sin recomputar nada en el cliente.

## 7. Pruebas y validación

- [x] 7.1 Ejecutar `npm run lint` y corregir hallazgos.
- [x] 7.2 Ejecutar `npm test` y corregir fallos; confirmar que los tests
      nuevos de la sección 2.4 pasan.
- [x] 7.3 Ejecutar `npm run build` por el impacto en tipos, `ProductForm`,
      `PosView`, `SaleDetail` y `ProductsView`.
- [x] 7.4 Validar contra backend real la creación de productos `pesable`, la
      creación de líneas de venta por peso con y sin precio real, y la
      lectura de `GET /sales/{id}` con ambos precios — evidencia: requests y
      responses verificadas, no sólo el código.
- [x] 7.5 Ejecutar la revisión UX/UI siguiendo
      `ai/skills/ux-ui-supervisor/SKILL.md` sobre `ProductForm`, `PosView` y
      `SaleDetail`, y resolver los hallazgos aplicables antes del cierre.

## 8. Cierre condicionado

- [x] 8.1 Revisar que el diff sólo contenga el alcance implementado, sin
      dependencias nuevas ni llamadas directas al backend fuera de `api()`.
- [x] 8.2 Sincronizar los deltas con `openspec/specs/ui-catalog/spec.md`,
      `openspec/specs/ui-pos/spec.md` y `openspec/specs/ui-sales/spec.md`, y
      archivar el change sólo con decisión explícita del usuario y después
      de completar las verificaciones anteriores.

### Evidencia de implementación

- El backend local contiene el contrato definitivo en `catalog` y `sales`:
  `unit_type`, `price_per_kg`, `weight`, `calculated_subtotal` y
  `actual_price`. No había una instancia HTTP local disponible para completar
  la verificación end-to-end de 0.1, 0.2 y 7.4.
- La revisión UX/UI y las pruebas manuales de teclado, responsive,
  accesibilidad y flujo mixto fueron confirmadas por el usuario después de la
  implementación.
