## 0. Prerrequisitos bloqueantes y coordinación

Este change es **BREAKING (backend)**. Ninguna tarea de la sección 1 en adelante
puede empezar hasta cerrar esta sección. La evidencia de 0.1 a 0.6 es una
**instancia de backend en ejecución** (request + response reales), no la lectura
del código Go: varias respuestas existentes cambian de forma, así que el frontend
compila igual y falla en runtime
(`ai/context/backend-coordination.md`, "Dependencia de despliegue").

- [x] 0.1 (Backend real) Verificado contra `localhost:8080` el 2026-08-04:
      lista y detalle exponen `sells_by_unit`, `units_per_package`,
      `extra_margin_percent`, `parent_product_id` y `unit_product`; el hijo
      aparece en el listado y no existe un filtro para ocultarlo.
- [x] 0.2 (Backend real) Verificado contra `localhost:8080` el 2026-08-04:
      `POST /products` creó padre e hijo con `id`, `name` y `sku`; para precio
      padre $15, costo $9, 4 unidades y margen 20%, el hijo devolvió precio $4,50
      y costo $2,25 sin recibirlos en el request.
- [x] 0.3 (Backend real) Verificado contra `localhost:8080` el 2026-08-04:
      al actualizar el precio del padre de $15 a $20, el precio del hijo pasó de
      $4,50 a $6,00 usando el margen persistido.
- [x] 0.4 (Backend real) Verificado contra `localhost:8080` el 2026-08-04:
      apagar el flag inactivó sólo al hijo; volver a encenderlo reactivó el mismo
      `id`; `inventory` recibió `403`; desactivar el hijo preservó el padre activo
      y desactivar el padre dejó ambos inactivos.
- [x] 0.5 (Backend real) Verificado contra `localhost:8080` el 2026-08-04:
      las colisiones del nombre padre y del derivado devuelven `409` con
      `conflict.id`, `conflict.name` y `conflict.sku`. No existe consulta exacta
      de nombre: `GET /products?name=` se ignora; 3.9 queda descartada.
- [x] 0.6 Regla de redondeo confirmada: backend redondea costo y precio derivados
      half-up a dos decimales. Decisión del usuario (2026-08-04): mantener la
      sugerencia del frontend (`roundPriceToSuggestedAmount`) y aceptar la
      divergencia visible al guardar.
- [x] 0.7 (Backend real) Verificado contra `localhost:8080` el 2026-08-04:
      un producto sin venta por unidad se creó, leyó y editó con el flujo previo;
      los campos nuevos permanecen opcionales.
- [x] 0.8 Campos definitivos confirmados: `sells_by_unit`,
      `units_per_package`, `extra_margin_percent`, `parent_product_id` y
      `unit_product` (`id`, `name`, `sku`, `price`, `active`).
- [x] 0.9 Decisión del usuario (2026-08-04): integrar coordinadamente este change
      con `add-frontend-product-cost-margin-auto-price` en `ProductForm.tsx` y
      `src/lib/products.ts`, sin modificar el alcance de ninguno.

## 1. Tipos

- [x] 1.1 Extender `Product` en `src/lib/types.ts` con la relación padre-hijo, la
      marca de producto derivado, las unidades por paquete, el margen extra y el
      precio por unidad, con los nombres confirmados en 0.8 y la nullabilidad
      real observada en 0.1. Importes como **string decimal**, unidades como
      entero. (Inspección: ningún campo de dinero tipado como `number`.)
- [x] 1.2 Actualizar el tipo del body de `POST /api/v1/products` y
      `PUT /api/v1/products/{id}` con el flag de venta por unidad, las unidades
      por paquete y el margen extra, sin incluir el costo derivado del hijo.
      (Inspección.)
- [x] 1.3 Tipar la respuesta de creación que devuelve los dos productos, según lo
      observado en 0.2, sin declarar shapes anónimos dentro de la view.
      (Inspección.)

## 2. Helpers puros (`src/lib/products.ts`)

- [x] 2.1 Agregar una función pura que calcule el precio de venta por unidad a
      partir del precio del paquete (string decimal), las unidades por paquete
      (entero) y el margen extra (porcentaje), operando en centavos con
      `toCents`/`fromCents` de `lib/money.ts` y aplicando el mismo redondeo
      sugerido que ya usa el formulario. Devuelve `null` cuando el precio no es
      un decimal válido, las unidades son menores a 2 o no enteras, o el margen
      no es finito.
- [x] 2.2 Agregar la función inversa: derivar el margen extra a partir del precio
      del paquete, las unidades por paquete y un precio por unidad ingresado a
      mano. Devuelve `null` con las mismas entradas inválidas y cuando el precio
      base por unidad es cero.
- [x] 2.3 Agregar una función pura que arme el texto de base de cálculo
      (`Base: … · +…% = …`) reutilizando `formatMoney`, para que el copy no se
      construya dentro de la view.
- [x] 2.4 Agregar una función pura que derive el nombre del producto por unidad
      (`{nombre} (unidad)`) desde el nombre del paquete, usada tanto por el
      pre-chequeo de colisión como por cualquier texto que lo muestre.
- [x] 2.5 (Prueba automatizada) Extender `src/lib/products.test.ts` con: precio
      unitario de un caso exacto y de uno que fuerza redondeo; unidades `1`, `0`,
      negativas y no enteras devuelven `null`; precio de paquete vacío o no
      numérico devuelve `null`; margen `0` devuelve el precio base redondeado;
      ida y vuelta precio→margen→precio; margen negativo; y el nombre derivado
      con espacios al final. Environment `node`, sin DOM.

## 3. `ProductForm` — checkbox, campos y avisos

- [ ] 3.1 Agregar el checkbox "Este producto también se vende por unidad"
      inmediatamente después del bloque de precio, renderizado **sólo** cuando el
      tipo de producto es `unitario`. Cambiar el tipo a `pesable` con el bloque
      abierto lo cierra y descarta sus valores del payload. (Inspección + prueba
      manual.)
- [ ] 3.2 Renderizar el bloque de tres campos ("Unidades por paquete", "Margen
      extra por unidad (%)", "Precio de venta por unidad") con `aria-expanded` y
      `aria-controls` en el checkbox, y la ayuda de cálculo asociada al precio
      por unidad con `aria-describedby`. (Inspección + prueba manual con lector
      de pantalla o inspector de accesibilidad.)
- [ ] 3.3 Conectar los recálculos con los helpers de la sección 2: cambiar precio
      del paquete, unidades o margen recalcula el precio por unidad; editar el
      precio por unidad recalcula el margen. Entradas incompletas o inválidas no
      pisan lo ya escrito ni muestran base de cálculo. (Prueba manual.)
- [x] 3.4 Enviar el flag, las unidades por paquete y el margen extra en
      `POST /products` y `PUT /products/{id}`; no enviar el costo del hijo.
      (Inspección del payload contra 0.2.)
- [ ] 3.5 Mostrar el `{ message }` del backend bajo el campo correspondiente para
      unidades por paquete o margen inválidos, preservando el resto de los
      valores. (Prueba manual contra backend real.)
- [ ] 3.6 Reemplazar el popup de éxito para que nombre los dos productos creados
      con sus SKU cuando el backend devuelve dos, conservando "Inicializar stock"
      (que sigue preseleccionando el producto **paquete**) y "Ahora no", y
      dejando el texto actual intacto cuando se crea uno solo. (Prueba manual.)
- [ ] 3.7 En edición, pre-cargar el checkbox y los tres campos desde los valores
      persistidos del producto. (Prueba manual.)
- [ ] 3.8 Agregar las dos advertencias de edición (unidades por paquete; precio
      del paquete) como texto inline persistente con `aria-live="polite"`, que no
      mueven el foco y que usan el copy de `design.md` → Copy. (Prueba manual +
      inspección: no son toasts ni diálogos.)
- [x] 3.9 Descartada: la instancia no expone una consulta de coincidencia exacta
      no existe la consulta): pre-chequeo de colisión de nombre al salir del
      campo de nombre, sobre el nombre del paquete y —con el checkbox marcado— el
      nombre derivado.
- [ ] 3.10 Mostrar el aviso de nombre en colisión (nombre + SKU del producto en
      conflicto + link a su detalle) y deshabilitar el guardado hasta que el
      nombre cambie, tanto si la colisión la detecta el pre-chequeo como si la
      devuelve el backend al enviar. Un fallo de red del pre-chequeo no muestra
      aviso ni bloquea. (Prueba manual contra backend real.)
- [ ] 3.11 Mostrar el aviso al desmarcar el checkbox (el producto por unidad se
      desactiva conservando historial y stock) antes de guardar. (Prueba
      manual.)
- [ ] 3.12 Deshabilitar el checkbox con su explicación cuando el producto
      derivado está inactivo y el usuario no es `admin`; dejarlo operable cuando
      el derivado está activo (`design.md`, Decisión 9). Al recibir un `403` del
      backend, mostrar su mensaje sin limpiar sesión ni redirigir. (Inspección
      del gate + prueba manual con un usuario `inventory`.)
- [ ] 3.13 (Prueba manual de teclado) Marcar el checkbox con `Space` mueve el
      foco a "Unidades por paquete"; desmarcarlo lo deja en el checkbox; el orden
      de tabulación de los tres campos es unidades → margen → precio; ninguna
      advertencia ni recálculo roba el foco; el barcode conserva el foco inicial
      del alta.
- [ ] 3.14 (Prueba manual de responsive) A 320 px: los tres campos apilan en una
      columna, la ayuda de cálculo envuelve sin desbordar, no hay scroll
      horizontal, y el popup de éxito con dos productos cabe en 320×568 con sus
      dos acciones visibles.

## 4. `ProductsView` — listado

- [ ] 4.1 Mostrar el badge de texto "Por unidad" para un producto derivado, en la
      tabla de escritorio y en las tarjetas móviles, usando el primitive `Badge`
      del UI kit y sin comunicar el estado sólo por color. (Inspección + prueba
      manual.)
- [ ] 4.2 Verificar que un producto no derivado no muestra el badge y que la
      búsqueda y los filtros vigentes siguen funcionando con los productos
      derivados presentes en la lista. (Prueba manual.)
- [ ] 4.3 (Prueba manual de responsive) El badge no empuja el nombre fuera de la
      fila ni provoca scroll horizontal a 320 px.

## 5. `ProductDetail` — relación, sólo lectura y baja acoplada

- [ ] 5.1 En el detalle de un producto paquete que se vende por unidad, mostrar
      el nombre, SKU, precio unitario y estado del producto derivado, con link a
      su detalle. (Prueba manual.)
- [ ] 5.2 En el detalle de un producto derivado, mostrar el badge "Por unidad",
      la explicación de que se genera desde su padre y el link al padre, sin
      ofrecer el formulario de edición (`design.md`, Decisión 6). (Inspección +
      prueba manual.)
- [ ] 5.3 En el detalle de un producto derivado cuyo padre está inactivo, mostrar
      en texto que el producto por paquete está inactivo. (Prueba manual.)
- [ ] 5.4 Agregar al diálogo de confirmación de baja de un paquete con venta por
      unidad la línea que nombra el producto derivado que también quedará
      inactivo; y al del derivado, la aclaración de que el paquete sigue activo.
      (Prueba manual.)
- [x] 5.5 Verificar por inspección que la baja sigue emitiendo **una sola**
      llamada a `POST /products/{id}/deactivate` y que el frontend no desactiva
      al hijo por su cuenta.
- [ ] 5.6 Releer el producto después de desactivar y después de reactivar, y
      mostrar el estado resultante real del par en vez de asumirlo. (Prueba
      manual contra backend real, cubriendo el caso de 0.4.)
- [ ] 5.7 Verificar que el control de reactivación sigue **ausente** (no
      deshabilitado) para roles distintos de `admin`, sin regresión respecto del
      comportamiento vigente. (Inspección + prueba manual.)

## 6. Pruebas y validación

- [x] 6.1 Ejecutar `npm run lint` y corregir hallazgos.
- [x] 6.2 Ejecutar `npm test` y confirmar que los tests nuevos de 2.5 pasan.
- [x] 6.3 Ejecutar `npm run build` por el impacto en `src/lib/types.ts` y en las
      pantallas de producto.
- [ ] 6.4 (Backend real) Validar end-to-end: alta de un producto con venta por
      unidad, verificación de los dos productos creados y sus SKU en el popup,
      edición del precio del paquete con recálculo del precio unitario, apagado y
      reencendido del flag, baja del paquete con el hijo acoplado, y rechazo por
      nombre duplicado. Evidencia: requests y responses observadas, no sólo el
      código.
- [ ] 6.5 Ejecutar la revisión UX/UI siguiendo `ai/skills/ux-ui-supervisor/SKILL.md`
      sobre `ProductForm`, `ProductsView` y `ProductDetail`, y resolver los
      hallazgos aplicables antes del cierre.
- [ ] 6.6 (Inspección) Confirmar que no se agregaron dependencias, que no hay
      llamadas al backend fuera de `api()`, que no hay aritmética de dinero con
      floats y que no se recalcula ningún agregado de negocio en el cliente.

## 7. Cierre condicionado

- [ ] 7.1 Revisar que el diff contenga sólo el alcance de este change, sin tocar
      inventario ni POS (que son los changes siguientes).
- [ ] 7.2 Sincronizar el delta con `openspec/specs/ui-catalog/spec.md` y archivar
      el change **sólo con decisión explícita del usuario** y después de
      completar las verificaciones anteriores. No ejecutar como parte de la
      implementación.
- [ ] 7.3 Con este change cerrado, escribir el change de inventario
      (`ui-inventory`) sobre `backend-request.md` §6, §7 y §8 — decisión del
      usuario, fuera del alcance de este change.
