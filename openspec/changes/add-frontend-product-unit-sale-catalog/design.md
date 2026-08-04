## Context

El Requirement Context aprobado ("Venta por unidad suelta de productos vendidos
por paquete") define un feature que atraviesa catálogo, inventario y POS, y
recomienda partirlo en tres changes de frontend más un pedido de backend. Este
documento diseña **sólo el primero**: el catálogo.

Estado verificado hoy (2026-08-04):

- `../backend/internal/catalog/domain/product.go`: `Product` tiene `ID, SKU,
  Barcode, Name, Category, UnitType, Price, PricePerKg, Cost, Active,
  CreatedAt, UpdatedAt`. No hay relación entre productos, ni unidades por
  paquete, ni margen persistido.
- `rg` sobre `../backend` por `parent_product|units_per_package|sells_by_unit|
  extra_margin`: sin resultados.
- `../backend/internal/bootstrap/router.go`: `POST /api/v1/products`,
  `PUT /api/v1/products/{id}`, `POST /api/v1/products/{id}/deactivate`
  (`inventory` + `admin`) y `POST /api/v1/products/{id}/activate` (`admin`)
  existen con esa forma; no hay ninguna ruta de búsqueda de productos por
  nombre.
- `openspec/specs/ui-catalog/spec.md`: el alta empieza por barcode (primer campo,
  foco inicial) con chequeo de duplicado por `Enter`, y termina en un popup de
  éxito que nombra **un** producto con dos acciones.
- `src/lib/products.ts` ya expone `computeSalePriceFromCost`,
  `computePercentFromPrices`, `computeMarginAmount` y
  `roundPriceToSuggestedAmount` (redondeo al múltiplo de $50 hacia arriba, mínimo
  $5), del change abierto `add-frontend-product-cost-margin-auto-price`.

Este change es **BREAKING (backend)** y sigue el precedente
`add-frontend-product-weight-based-pricing`: se especifica el comportamiento
completo, se documenta el bloqueo en `backend-request.md`, y la sección 0 de
`tasks.md` exige verificación contra una instancia en ejecución antes de
escribir código.

## Goals / Non-Goals

### Goals

- Que un alta sola produzca el par paquete + unidad, con el precio unitario
  calculado y visible en el momento de cargarlo.
- Que el kiosquero entienda, sin abrir otra pantalla, qué dos productos va a
  crear y con qué SKU quedaron.
- Que el producto derivado sea reconocible en el listado y en el detalle, y que
  su relación con el paquete sea navegable en ambos sentidos.
- Que activar y desactivar la venta por unidad sea reversible y no destruya
  historial.
- Que ninguna regla de negocio (redondeo, costo derivado, sincronización de
  precio, colisión de nombre) se invente en el cliente.

### Non-Goals

- Stock de dos niveles, inicialización con dos cantidades, ajuste por nivel y el
  tipo de movimiento de apertura automática: change de inventario.
- Disponibilidad y bloqueo de venta en el POS, y la migración a búsqueda
  server-side: change de POS.
- Cambiar el flujo de escaneo por barcode en cualquier pantalla.
- Consolidar paquete y unidad en reportes, cierre de caja o detalle de venta.
- Editar a mano el nombre, el costo o el precio del producto derivado.
- Soportar más de un nivel de empaque.

## User flow

### Alta (camino feliz)

1. `/products/new`. El foco arranca en barcode, como hoy. Se escanea el barcode
   del paquete; el chequeo de duplicado por `Enter` no cambia.
2. Nombre, categoría, SKU sugerido, tipo `unitario`, costo, precio del paquete
   (con el % de ganancia y el margen que ya existen hoy).
3. Debajo del bloque de precio aparece el checkbox "Este producto también se
   vende por unidad". Al marcarlo, se despliegan los tres campos y el foco pasa
   a **unidades por paquete**.
4. Se escribe `12`. El **precio de venta por unidad** se autocalcula desde el
   precio del paquete y el **margen extra por unidad (%)** (por defecto `0`) y
   muestra su base: `Base: $ 708,00 · +20% = $ 850,00`.
5. Se guarda. El popup de éxito nombra los dos productos creados con sus SKU y
   ofrece "Inicializar stock" y "Ahora no", igual que hoy.

### Edición

1. `/products/[id]` de un paquete que ya vende por unidad: el checkbox está
   marcado y los tres campos muestran los valores persistidos.
2. Cambiar el precio del paquete recalcula el precio por unidad y muestra la
   advertencia de que se pisa cualquier override previo.
3. Cambiar unidades por paquete muestra la advertencia de conversiones futuras y
   de que el stock actual no se toca.
4. Desmarcar el checkbox muestra qué va a pasar (el producto por unidad se
   desactiva, conserva historial y stock) y, al guardar, lo desactiva.
5. `/products/[id]` de un producto derivado: detalle de sólo lectura, con badge
   "Por unidad", link al paquete y las acciones de desactivación/reactivación.

### Desactivación

1. Desactivar un paquete con venta por unidad: el diálogo de confirmación (ya
   estilado con el color de error) suma una línea que nombra el producto por
   unidad que también quedará inactivo.
2. Desactivar un producto derivado: el diálogo aclara que el paquete sigue
   activo.

## UI states

**`ProductForm` (alta y edición)**

- *Loading:* sin cambios. El bloque de venta por unidad no hace requests
  propios; los tres campos son cálculo local sobre datos ya presentes.
- *Empty:* no aplica (formulario).
- *Pending:* el guardado usa el `pending` que ya tiene el botón de submit; el
  checkbox y los tres campos quedan deshabilitados mientras se guarda.
- *Error:* el `{ message }` del backend se muestra tal cual, bajo el campo
  correspondiente, preservando todos los valores ingresados. Cubre
  `units_per_package` inválido, margen inválido y la colisión de nombre.
- *Success (alta):* popup con los dos productos y sus SKU.
- *Success (edición):* toast "Producto actualizado", como hoy.

**Aviso de nombre en colisión**

- Inline, junto al campo de nombre, con el nombre y el SKU del producto en
  conflicto y un link a `/products/{id}`. Bloquea el guardado hasta que el
  nombre cambie. Idéntico en estructura al aviso de barcode duplicado vigente.

**`ProductsView` (listado)**

- Cada producto derivado muestra un badge de texto "Por unidad" además de su
  nombre, en la tabla de escritorio y en las tarjetas móviles. Los estados de
  carga, vacío y error del listado no cambian.

**`ProductDetail`**

- Paquete con venta por unidad: bloque que nombra el producto por unidad, su
  SKU, su precio unitario y su estado (activo/inactivo), con link a su detalle.
- Producto derivado: badge "Por unidad", link al paquete, y un aviso cuando el
  paquete está inactivo.

## Decisions

### 1. El checkbox sólo existe para `unit_type = unitario`

Un producto `pesable` cobra por kilogramo y no tiene "unidades por paquete": la
combinación no significa nada. El checkbox no se renderiza cuando el tipo es
`pesable`, y si el tipo cambia de `unitario` a `pesable` con el checkbox marcado,
el bloque se cierra y sus valores se descartan del payload.

*Alternativa descartada:* mostrarlo deshabilitado con una explicación. Agrega
ruido permanente a un formulario que ya creció (barcode-first, SKU sugerido,
costo/%/margen) a cambio de informar sobre una combinación que nadie va a
intentar.

### 2. El bloque se inserta después del precio, y el foco no se roba

El barcode es el primer campo con foco inicial por contrato vigente
(`ui-catalog`, "Barcode field is first and initially focused"). El bloque de
venta por unidad va **después** del precio, que es su insumo de cálculo, para no
alterar ese orden ni el recorrido de tabulación existente. Al **marcar** el
checkbox el foco pasa al primer campo desplegado (unidades por paquete), porque
es una acción explícita del usuario; ninguna advertencia ni recálculo mueve el
foco.

### 3. El precio unitario se calcula en el cliente sólo como sugerencia

El frontend calcula
`(precio del paquete ÷ unidades por paquete) × (1 + margen extra ÷ 100)` con
`roundPriceToSuggestedAmount`, la misma función que ya redondea el precio de
venta sugerido en este formulario. Pero el valor **autoritativo** es el que
devuelve el backend: después de guardar o de recargar el producto, el campo
muestra lo que vino del backend, aunque difiera de la sugerencia del cliente.

*Por qué:* la regla de redondeo del precio derivado y del costo derivado es una
regla de negocio y pertenece al backend
(`ai/context/backend-coordination.md`). El cliente no puede ser la fuente de un
valor que además el backend recalcula solo cada vez que cambia el precio del
paquete.

*Consecuencia:* si el backend adopta una regla de redondeo distinta a
`roundPriceToSuggestedAmount`, la sugerencia y el valor guardado van a diferir en
el alta. Se le pide explícitamente al backend que declare su regla
(`backend-request.md` §5) para poder alinear la sugerencia.

### 4. El margen extra por unidad se persiste; el % de ganancia costo→precio no

Son dos conceptos distintos que conviven en el mismo formulario:

- el `%` de ganancia costo→precio es una **ayuda de cálculo** que no se persiste
  (decisión ya registrada en `add-frontend-product-cost-margin-auto-price`);
- el **margen extra por unidad** sí se persiste, porque el backend lo necesita
  para recalcular el precio unitario cada vez que cambia el precio del paquete,
  sin intervención del usuario.

Es un cambio de criterio consciente respecto de lo vigente, no una inconsistencia
por descuido. Para que no se confundan visualmente, el margen extra vive dentro
del bloque desplegado del checkbox, con su propia etiqueta ("Margen extra por
unidad (%)"), separado del bloque de precio del paquete.

### 5. El override del precio unitario deriva el margen, y el margen es lo que se envía

Cuando el usuario edita a mano el precio de venta por unidad, el frontend deriva
el margen extra correspondiente con la función inversa y actualiza el campo de
margen, igual que hoy hace el par costo/precio/%. Lo que viaja al backend es el
margen (más el precio, si el backend lo acepta como confirmación), porque el
margen es el dato que sobrevive al recálculo automático.

*Consecuencia aceptada (decisión 14 del Requirement Context):* un override manual
se convierte en un margen; si el redondeo del backend no reproduce exactamente el
precio tipeado, el precio guardado puede diferir en centavos del ingresado. La
advertencia de recálculo lo hace explícito.

### 6. El producto derivado no se edita: su detalle es de sólo lectura

Su nombre no es editable (decisión 6 del Requirement Context), su costo y su
precio los deriva el backend desde el padre (decisiones 13 y 14), y no tiene
barcode. No queda ningún campo editable con sentido. Por eso `/products/[id]` de
un producto derivado muestra el detalle con un aviso ("Este producto se genera
desde …", con link al paquete) y **no** ofrece el formulario de edición; sí
conserva las acciones de desactivación y reactivación, que son propias del hijo
por el acoplamiento unidireccional.

*Alternativa descartada:* mostrar el formulario con todos los campos
deshabilitados. Un formulario entero deshabilitado es una promesa rota: el
usuario intenta editar, no puede, y no sabe por qué.

### 7. Colisión de nombre: pre-chequeo si el backend lo permite, `409` como red final

El patrón vigente para barcode combina un chequeo previo
(`GET /products/barcode/{barcode}` disparado por `Enter`) con la unicidad del
backend en el submit. Se replica:

- **Pre-chequeo:** al salir del campo de nombre (blur) con el nombre no vacío, se
  consulta al backend por una coincidencia exacta —del nombre del paquete y,
  cuando el checkbox está marcado, también del nombre derivado
  `{nombre} (unidad)`. Ese endpoint **no existe hoy** y se pide en
  `backend-request.md` §10.
- **Red final:** el rechazo del submit (`409` o el status que use el backend)
  produce el mismo aviso. Para poder linkear al producto en conflicto, el error
  tiene que traer su `id`, su `name` y su `sku`; también se pide en §10.
- En ambos casos el aviso se limpia y el guardado se rehabilita apenas cambia el
  nombre, sin disparar un chequeo nuevo hasta el próximo blur.
- Si el pre-chequeo **falla** por red o error de servidor (no por "no hay
  coincidencia"), no se muestra aviso ni se bloquea el guardado: la unicidad del
  backend queda como último resguardo. Mismo criterio que el chequeo de barcode
  hoy.

### 8. Desactivación acoplada: el frontend avisa, el backend acopla

El acoplamiento padre→hijo lo ejecuta el backend en
`POST /products/{id}/deactivate`. El frontend no emite una segunda llamada para
desactivar el hijo: eso duplicaría una regla de negocio en el cliente y dejaría
un estado a medias si la segunda llamada falla. El rol del frontend es
**anunciarlo antes** (línea extra en el diálogo de confirmación, nombrando el
producto por unidad) y **releer** el producto después para reflejar el estado
real.

La reactivación del paquete no asume nada sobre el hijo: se relee y se muestra lo
que el backend haya hecho. Si el backend decide no reactivar el hijo
automáticamente, el detalle del paquete lo va a mostrar inactivo y el usuario
puede reactivarlo por separado. La pregunta está en `backend-request.md` §9.

### 9. El checkbox en edición para el rol `inventory`

`ui-catalog` fija hoy que la reactivación es admin-only y que para otros roles el
control está **ausente**, no deshabilitado. Volver a marcar el checkbox es una
reactivación, así que un `inventory` no debería poder hacerlo (y el backend lo
rechazaría con `403`).

**Decisión:** cuando el producto derivado está **inactivo** (checkbox
desmarcado) y el usuario no es `admin`, el checkbox se renderiza
**deshabilitado**, con un texto asociado: "Sólo un administrador puede volver a
habilitar la venta por unidad". Cuando el derivado está **activo**, el checkbox
es operable para `inventory` y `admin`, porque desmarcarlo es una desactivación
y ese rol ya puede desactivar productos.

*Por qué se aparta del patrón "ausente":* allá el control es una acción aislada
que puede desaparecer sin dejar hueco. Acá el checkbox es también la
representación del estado del producto: ocultarlo haría desaparecer la
información de que ese producto tiene (o tuvo) venta por unidad, y produciría dos
formularios distintos según el rol sobre el mismo producto. La asimetría de fondo
—desactivar es operativo, reactivar es administrativo— se preserva igual.

*Verificación:* si aun así el backend responde `403`, se muestra el mensaje sin
limpiar la sesión ni redirigir a login, como ya exige `ui-catalog`.

### 10. Advertencias: texto persistente, región viva, sin robar el foco

Las dos advertencias de edición (unidades por paquete, precio del paquete) se
muestran como texto inline junto al campo, con `role="status"` / `aria-live="polite"`,
no como diálogo modal ni como toast efímero. Un toast desaparece antes de que el
usuario decida; un modal interrumpe una edición en curso. La base de cálculo del
precio unitario se asocia al input por `aria-describedby`.

### 11. El producto derivado se marca con un badge de texto

En el listado y en el detalle, un producto derivado muestra un badge
`Por unidad` (tono neutral, con texto — nunca sólo color).

*Por qué, si el nombre ya dice "(unidad)":* en las tarjetas móviles y en la
columna de nombre de la tabla el texto trunca, y "(unidad)" es justamente el
final del string, o sea lo primero que se pierde. El badge sobrevive al truncado
y da un ancla estable para filtrar visualmente.

### 12. R2 — bajar `unidades por paquete` con sueltas por encima del nuevo tamaño

La advertencia de edición **menciona explícitamente** el caso: el stock actual no
se modifica, y un paquete abierto puede quedar con más unidades sueltas que el
nuevo tamaño de paquete hasta que se consuman. Se elige mencionarlo porque el
estado resultante es visible en el inventario y sin la mención parece un bug del
sistema.

El frontend **no** consulta el stock para decidir si mostrarla: en este change no
toca inventario, y la advertencia es informativa, no condicional. Si el backend
decide **rechazar** ese estado en vez de aceptarlo, el frontend muestra su
`{ message }` bajo el campo y no necesita cambiar nada más; la pregunta está en
`backend-request.md` §2.

### 13. "Inicializar stock" del popup preselecciona el paquete

El deep-link a inventario con el producto preseleccionado (`ui-inventory`) no
cambia en este change: apunta al producto paquete. El diálogo de dos cantidades
—y la definición de sobre cuál de los dos productos vive el stock de dos
niveles— es materia del change de inventario y está pedido al backend en
`backend-request.md` §6.

## Copy

Español rioplatense, sentence case. Textos propuestos:

| Elemento | Texto |
|---|---|
| Checkbox | `Este producto también se vende por unidad` |
| Campo 1 | `Unidades por paquete` |
| Campo 2 | `Margen extra por unidad (%)` |
| Campo 3 | `Precio de venta por unidad` |
| Ayuda de cálculo | `Base: $ 708,00 · +20% = $ 850,00` |
| Ayuda del campo 1 | `Cuántas unidades sueltas trae cada paquete cerrado.` |
| Advertencia de unidades | `Cambiar las unidades por paquete afecta las conversiones futuras. El stock actual no se modifica: si un paquete abierto tiene más unidades sueltas que el nuevo tamaño, se mantienen hasta consumirse.` |
| Advertencia de precio | `Al cambiar el precio del paquete, el precio por unidad se recalcula con el margen extra guardado y se pierde cualquier precio por unidad que hayas puesto a mano.` |
| Aviso al desmarcar | `El producto por unidad se va a desactivar. Conserva su historial de ventas y su stock, y podés volver a habilitarlo cuando quieras.` |
| Checkbox bloqueado (no admin) | `Sólo un administrador puede volver a habilitar la venta por unidad.` |
| Aviso de nombre en colisión | `Ya existe un producto con este nombre: {nombre} ({sku}).` + link `Ver producto` |
| Popup de éxito (título) | `Se crearon 2 productos` |
| Popup de éxito (cuerpo) | `{nombre} ({sku})` y `{nombre} (unidad) ({sku})`, uno por línea |
| Popup de éxito (un solo producto) | Texto actual, sin cambios |
| Badge del derivado | `Por unidad` |
| Detalle del derivado | `Este producto se genera desde {nombre}.` + link |
| Detalle del paquete | `También se vende por unidad: {nombre} (unidad) — {sku}` + link |
| Diálogo de baja del paquete | Texto actual + `El producto por unidad ({nombre}) también va a quedar inactivo.` |
| Diálogo de baja del derivado | Texto actual + `El producto por paquete sigue activo.` |
| Aviso en el derivado con padre inactivo | `El producto por paquete está inactivo.` |

## Accessibility

- El checkbox tiene etiqueta explícita y usa `aria-expanded` + `aria-controls`
  sobre el contenedor de los tres campos.
- La ayuda con la base de cálculo se asocia al precio por unidad con
  `aria-describedby`; no queda como texto suelto al lado del input.
- La ayuda de "unidades por paquete" también se asocia con `aria-describedby`.
- Las dos advertencias de edición se anuncian con `aria-live="polite"` y se
  comunican con texto, no con color.
- El aviso de nombre en colisión sigue el mismo marcado accesible que el aviso de
  barcode duplicado vigente, con un link con nombre accesible que incluye el
  producto en conflicto.
- El badge "Por unidad" lleva texto visible; el estado derivado no se comunica
  sólo por tono.
- El bloque de sólo lectura del producto derivado no usa `disabled` sobre un
  formulario completo (ver Decisión 6): es contenido de lectura con un link.
- Foco visible y `prefers-reduced-motion` no se alteran.

## Keyboard and focus behavior

- El barcode conserva el foco inicial del formulario de alta; el orden de tabulación
  existente no cambia porque el bloque nuevo se agrega al final del bloque de precio.
- El checkbox es operable con `Space`; al **marcarlo**, el foco se mueve al campo
  "Unidades por paquete". Al **desmarcarlo**, el foco permanece en el checkbox.
- Los tres campos son navegables con `Tab` en el orden unidades → margen →
  precio por unidad.
- Ninguna advertencia ni recálculo mueve el foco.
- El popup de éxito mantiene el comportamiento vigente: foco atrapado dentro del
  diálogo, `Escape` equivale a "Ahora no", y al cerrarse el foco vuelve al
  formulario en blanco.
- El diálogo de confirmación de baja mantiene su cancelación y su retorno de foco
  al control que lo abrió.
- El link del aviso de nombre en colisión es alcanzable por teclado desde el
  campo de nombre.

## Responsive behavior

- Desde 320px los tres campos apilan en una sola columna, sin scroll horizontal.
  A partir de `sm` pueden compartir la grilla de dos columnas que ya usan costo y
  precio; el precio por unidad y su texto de ayuda ocupan la fila completa para
  que la base de cálculo no se corte.
- El texto de ayuda `Base: … · +…% = …` debe poder envolver en dos líneas sin
  desbordar.
- El badge "Por unidad" en el listado no puede empujar el nombre fuera de la
  fila: en la tabla va debajo del nombre o con truncado del nombre y badge fijo;
  en las tarjetas móviles va en su propia línea.
- El popup de éxito con dos productos crece en alto: debe seguir cabiendo en
  320×568 con sus dos acciones visibles sin scroll interno.

## API contract

Todos los paths existen bajo `/api/v1` y se consumen por `api<T>()` a través del
proxy; ningún llamado directo al backend.

**Sin cambio de forma:** `GET /api/v1/categories`,
`GET /api/v1/products/sku-suggestion?category_id=`,
`GET /api/v1/products/barcode/{barcode}`, `POST /api/v1/products/{id}/activate`.

**Con cambio de forma o de efecto (BREAKING en runtime):**

| Endpoint | Qué cambia | Roles (sin cambios) |
|---|---|---|
| `GET /api/v1/products` | campos nuevos en `Product`; define si el hijo aparece en la lista y con qué filtro | `inventory`, `admin` |
| `GET /api/v1/products/{id}` | campos nuevos en `Product` | `inventory`, `admin` |
| `POST /api/v1/products` | acepta unidades por paquete y margen extra; crea **dos** registros y devuelve ambos | `inventory`, `admin` |
| `PUT /api/v1/products/{id}` | acepta los mismos campos; recalcula costo y precio del hijo; activa/desactiva el hijo según el flag | `inventory`, `admin` |
| `POST /api/v1/products/{id}/deactivate` | desactiva también al hijo (unidireccional) | `inventory`, `admin` |

**Faltante y no asumido:** el endpoint (o parámetro) de búsqueda de nombre
exacto para el pre-chequeo de colisión. No se inventa su forma acá; se pide en
`backend-request.md` §10 y la tarea correspondiente queda bloqueada.

**Tipos:** dinero (`price`, `cost`, precio por unidad, costo derivado) sigue
siendo **string decimal**, nunca `number`; la aritmética del cliente usa
`toCents`/`fromCents` de `lib/money.ts`. Unidades por paquete es un entero ≥ 2.
El margen extra es un porcentaje; su tipo exacto (entero, decimal string) lo fija
el backend. Fechas: sin cambios (RFC3339 en `created_at`/`updated_at`). La forma
exacta de los campos nuevos en `Product` se declara en `lib/types.ts` **recién
después** de confirmarla contra el backend (tarea 0.3).

## Error handling

- Todo error de backend se muestra con su `{ message }` textual, sin traducir ni
  reinterpretar, bajo el campo correspondiente y preservando todos los valores
  ingresados.
- `409` (u otro status de unicidad) por SKU o barcode: comportamiento vigente,
  sin cambios.
- `409` (u otro) por nombre en colisión: aviso con link al producto en conflicto,
  guardado bloqueado hasta que el nombre cambie.
- Validación de unidades por paquete o margen inválidos: mensaje del backend bajo
  ese campo.
- `403` al reactivar el hijo desde un rol no admin: se informa la falta de
  permiso, **no** se limpia la sesión y **no** se redirige a login.
- `401`: sesión inválida, redirección a login — comportamiento global vigente,
  sin cambios en este change.
- Fallo del pre-chequeo de nombre (red o servidor): silencioso, sin bloquear el
  guardado (Decisión 7).
- Fallo ambiguo del guardado: no se asume éxito ni se reintenta en silencio; se
  muestra el error y el formulario conserva sus valores.

## Backend coordination

Dependencia dura de **contrato y de despliegue**. `backend-request.md` contiene
los 12 puntos del feature completo —para que el backend pueda planificar el
trabajo de una— marcando cuáles bloquean este change (§1, §2, §3, §4, §5, §9,
§10, §11) y cuáles son prerrequisitos de los changes de inventario y POS (§6,
§7, §8, §12).

Compatibilidad:

- **Frontend viejo + backend nuevo:** debe seguir funcionando. Un producto sin
  venta por unidad tiene que verse y editarse exactamente como hoy, y los campos
  nuevos deben ser opcionales en el request.
- **Frontend nuevo + backend viejo:** compila, pero falla en runtime en cuanto se
  marca el checkbox. Por eso las tareas quedan bloqueadas hasta verificar el
  despliegue contra una instancia en ejecución, no contra el código.

Orden de despliegue: **backend primero**, frontend después.

## Risks / Trade-offs

- **Divergencia de redondeo (Decisión 3).** Si el backend redondea distinto a
  `roundPriceToSuggestedAmount`, el precio sugerido en el alta y el precio
  guardado difieren, y el usuario ve "otro" número después de guardar. Mitigación:
  §5 del pedido al backend, y el campo siempre muestra el valor del backend
  después de guardar.
- **Granularidad del redondeo sobre un precio chico.**
  `roundPriceToSuggestedAmount` redondea hacia arriba al múltiplo de $50. Sobre un
  precio de paquete eso es poco perceptible, pero un precio **unitario** es por
  definición una fracción del precio del paquete: un cálculo de $70,80 se sugiere
  como $100, un 41% arriba. El ejemplo aprobado con el usuario ($708 · +20% =
  $850) queda bien redondeado, pero un kiosco con paquetes baratos vería saltos
  groseros. Se le pide explícitamente al backend (§5) que declare si su regla de
  redondeo del precio unitario usa una granularidad más fina; la tarea 0.6 obliga
  a comparar ambas antes de implementar, y si divergen la decisión vuelve al
  usuario.
- **Override que no sobrevive (Decisión 5).** Persistir el margen y no el precio
  hace que un override manual pueda perder centavos al recalcularse. Es el precio
  de que el precio unitario se mantenga sincronizado solo; la advertencia lo dice
  con todas las letras.
- **Pre-chequeo de nombre sin endpoint.** Si el backend decide no exponer una
  búsqueda por nombre exacto, la colisión sólo se detecta al guardar. El
  comportamiento observable (aviso + link + bloqueo) es el mismo, pero el usuario
  se entera más tarde. No es bloqueante para escribir el change; sí lo es para la
  tarea del pre-chequeo.
- **Conflicto de merge en `ProductForm.tsx`.** El change abierto
  `add-frontend-product-cost-margin-auto-price` ya modificó el bloque de precio
  de este mismo archivo. Se resuelve por orden de merge, no en código.
- **El hijo en `GET /products`.** Si aparece sin filtro, duplica filas en el
  listado de catálogo, en el selector de categorías y en el listado de
  inventario. Este change lo asume visible (es requisito del POS) y lo marca con
  badge; si el volumen molesta, hará falta el filtro pedido en §11.

## Migration Plan

1. **Backend:** implementar y desplegar §1-§5, §9, §10 y §11 de
   `backend-request.md`. Los productos existentes no se ven afectados: sin el
   flag de venta por unidad, todo el comportamiento actual queda idéntico.
2. **Frontend, este change:** tipos, helpers puros con tests, `ProductForm`,
   `ProductsView`, `ProductDetail`. La sección 0 de `tasks.md` no se marca sin
   evidencia contra una instancia en ejecución.
3. **Change de inventario** (`ui-inventory`): depende de §6, §7 y §8, y de que
   este change esté fusionado.
4. **Change de POS** (`ui-pos`): depende del change de inventario y de §12.

No hay migración de datos del lado del frontend: no hay estado persistido en el
cliente que dependa de estos campos.

## Rollback

- **Frontend:** revertir el change deja el catálogo exactamente como hoy. Los
  productos derivados ya creados siguen existiendo en el backend y se ven en el
  listado como productos normales llamados "… (unidad)", sin badge y sin link al
  padre: degradado, no roto.
- **Backend:** si el contrato se revierte después de que el frontend se
  desplegó, el formulario falla al guardar con el checkbox marcado. Mitigación:
  desplegar el backend primero y revertir en orden inverso (frontend antes que
  backend).
- No hay feature flag: el checkbox mismo actúa como opt-in por producto.

## Open Questions

Ninguna bloqueante. Quedan abiertas, para resolver con el backend o en el change
siguiente:

1. **Reactivación del paquete y su hijo.** Si reactivar el paquete reactiva
   también al hijo, o si quedan independientes. El frontend relee y muestra el
   estado real en cualquiera de los dos casos (Decisión 8); la respuesta sólo
   cambia el copy del diálogo de reactivación. Pedido en §9.
2. **Hijo activo con padre inactivo.** Si el backend permite reactivar el hijo
   mientras el padre está inactivo, o lo rechaza. El frontend ya muestra un aviso
   en el detalle del hijo; si el backend lo rechaza, muestra su mensaje. Pedido
   en §9.
3. **Filtro del hijo en `GET /products`.** Si conviene ocultarlo en el listado de
   catálogo o de inventario, y con qué parámetro. Pedido en §11; no bloquea este
   change, que lo asume visible.
4. **`ui-receiving` y compras.** Si la recepción de mercadería carga stock,
   la variante de dos niveles la alcanza. No afecta a este change (que no toca
   inventario) pero hay que confirmarlo antes de cerrar el alcance del change de
   inventario.
5. **Devoluciones de unidades sueltas.** Cómo reintegra el backend el stock de
   una venta que incluyó unidades sueltas. Pedido en §8; se resuelve en el change
   de inventario.
