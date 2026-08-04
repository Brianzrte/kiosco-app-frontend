# Design — Datos de proveedor, fecha objetivo, pesables y recepción del cajero

## Context

El rediseño aprobado de Compras y Proveedores se reparte en dos changes. El
primero, `redesign-frontend-purchasing-section`, es frontend puro: trae la
estructura visual de las cinco pantallas, el split de `PurchaseOrderForm.tsx`
(932 líneas), el banner de precarga con el pedido anterior, la reubicación de las
sugerencias, el modelo de resolución línea por línea del detalle y la fusión de
`ui-receiving` en `ui-suppliers-purchasing`.

Este change es el segundo: contiene exactamente los cuatro bloques del rediseño
que **no pueden existir sin backend nuevo**.

Estado verificado el 2026-08-04 contra `../backend`:

- `Supplier` es `{ID, Name, Active}` (`internal/purchasing/domain/supplier.go`);
  `POST /api/v1/suppliers` acepta sólo `{"name"}`; no existe
  `GET /api/v1/suppliers/{id}` (`internal/purchasing/transport/http/routes.go`).
- `PurchaseOrder` tiene `OrderedAt` y `ReceivedAt`, y ningún campo de fecha
  objetivo (`internal/purchasing/domain/purchase_order.go`).
- `PurchaseOrderItem.Quantity` y `.ReceivedQuantity` son `int`, igual que los
  tres DTOs que las escriben.
- `receivingWrapped` es `admin | inventory | receiving`
  (`internal/bootstrap/router.go:157-171`). `cashier` sólo tiene
  `POST /api/v1/purchase-orders/{id}/payment`.
- El gate del frontend en `src/app/(app)/purchasing/[id]/page.tsx` ya admite
  `cashier`: la pantalla monta y el primer `GET /purchase-orders/{id}` devuelve
  `403`. Es un defecto vivo, no una hipótesis.

Fuente canónica del markup: proyecto Claude Design
`1669eca0-5224-4459-8b68-524eb6c00266` ("Rediseño de Compras y Proveedores"),
archivos `PurchasingHub.dc.html`, `PurchaseOrderDetail.dc.html`,
`AddUncatalogedItem.dc.html`, `SupplierDetail.dc.html`,
`NewPurchaseOrder.dc.html`. El markup **se re-baja con DesignSync `get_file` al
momento de implementar**; no se pega HTML en este documento, que envejecería
respecto del proyecto de diseño.

## Goals / Non-Goals

**Goals**

1. Que el proveedor tenga ficha propia con los datos con los que se lo contacta y
   con los productos que se le compran, leídos desde su lado.
2. Que un pedido pueda declarar para cuándo se lo espera, y que el hub responda
   "qué llega hoy" con esa información.
3. Que un pesable se pueda pedir y recibir en su unidad real.
4. Que el cajero de mostrador reciba mercadería sin chocarse con un `403`.

**Non-Goals**

- La estructura visual, el split del formulario, la precarga del pedido anterior,
  las pestañas del alta de ítem y el modelo de resolución línea por línea: son de
  `redesign-frontend-purchasing-section`.
- Pantalla de la cola de ítems pendientes de alta.
- Notificaciones o recordatorios por fecha objetivo.
- Cambiar la regla de motivo obligatorio: sigue siendo obligatorio para todos los
  roles, incluido admin.
- Gestionar la asociación producto–proveedor **desde** la ficha del proveedor más
  allá de abrir el flujo existente: la escritura sigue siendo
  `PUT /products/{id}/suppliers`.

## Relación con las specs vigentes

Este change escribe deltas sólo sobre `ui-suppliers-purchasing`.

`ui-receiving` sigue diciendo hoy, en su requirement "Receiving section
restricted to Receiving and Admin", que un usuario cuyo único rol es `cashier`
"is redirected away and no purchase order data is requested". Eso contradice el
bloque D. La resolución **no** es de este change: `redesign-frontend-purchasing-section`
fusiona `ui-receiving` dentro de `ui-suppliers-purchasing` y elimina esa
capability. Por eso:

- este change **no** crea un delta de `ui-receiving`, para no editar dos changes
  la misma requirement;
- la implementación de este change está condicionada a que la fusión ya esté
  hecha y sincronizada. Implementarlo antes dejaría una contradicción normativa
  abierta. La tarea 0.2 lo verifica.

Las requirements de `ui-suppliers-purchasing` que este change modifica
—"Purchasing hub prioritizes pending orders", "Role-adaptive purchasing actions"
y "Supplier management preserves history"— también las toca el change hermano en
su parte visual. Si aquel las renombra o reescribe, este delta se rebasea sobre
el resultado antes de archivar.

## User flow

**B. Ficha de proveedor** — `/purchasing/suppliers` → activar una fila →
`/purchasing/suppliers/[id]`. Encabezado con nombre, estado y bajada de
antigüedad y frecuencia de visita; card de datos de contacto; card de productos
asociados; card teaser de los últimos tres pedidos con enlace al historial
filtrado por ese proveedor. `Editar ficha` abre el mismo diálogo de edición del
listado, ahora con los campos de contacto. `Desactivar` pide confirmación y, al
confirmar, la ficha queda en estado inactivo sin desaparecer.

**C. Fecha objetivo** — `/purchasing/new`: el usuario elige proveedor, deja o
cambia `Fecha de creación` y completa `Fecha objetivo`. Al crear, vuelve al
detalle del pedido, que muestra ambas fechas. En `/purchasing`, ese pedido cae en
"Qué llega hoy" o en "Esta semana" según su fecha objetivo.

**D. Recepción del cajero** — el cajero entra por la navegación a `/purchasing`,
ve "Qué llega hoy", activa `Recibir` en una fila y llega al detalle del pedido,
donde resuelve las líneas y confirma. No ve `Crear pedido` ni
`Lista de proveedores`, y `/purchasing/suppliers`, `/purchasing/suppliers/[id]`
y `/purchasing/new` le siguen negados.

## Decisions

### D1 — La ficha de proveedor es una ruta propia, no un diálogo

`/purchasing/suppliers/[id]`. Alternativa descartada: expandir la fila o abrir un
diálogo grande. Motivos: la ficha carga tres conjuntos de datos independientes
(proveedor, asociaciones, últimos pedidos), tiene acciones destructivas y debe
ser enlazable desde el detalle de un pedido y desde el historial. Un diálogo con
tres requests y navegación interna es peor en móvil y no se puede compartir por
URL. Costo: una ruta más y un `page.tsx` más con su gate.

### D2 — Los productos asociados se leen desde el lado del proveedor, pero se escriben desde el producto

La card "Productos asociados" es de lectura más navegación: cada fila lleva al
producto, y `Asociar producto` lleva al panel de asociación del producto elegido.
Alternativa descartada: escribir asociaciones desde el proveedor. El contrato
existente es `PUT /products/{id}/suppliers`, que **reemplaza la lista completa**
de proveedores de un producto; hacerlo desde el proveedor obligaría a leer y
reescribir la lista ajena de cada producto, con riesgo real de pisar
asociaciones. Si el backend expusiera una escritura desde el proveedor, se
revisa. Mientras tanto la ficha no inventa un camino de escritura frágil.

### D3 — `visit_frequency_days` y `ProductSupplier.replenishment_frequency_days` son datos distintos y el copy los distingue

Son dos frecuencias que ya conviven en el rediseño y que es fácil confundir:

| Dato | Nivel | Significa | Dónde se ve |
|---|---|---|---|
| `visit_frequency_days` (+ `visit_notes`) | Proveedor | Cada cuánto **pasa físicamente** a entregar | Card "Datos de contacto" → campo "Frecuencia de visita", y bajada del encabezado |
| `ProductSupplier.replenishment_frequency_days` | Asociación producto–proveedor | Cada cuánto **conviene reponer ese producto** con ese proveedor | Card "Productos asociados" → columna "Reposición" |

El copy no comparte etiqueta entre ambos: "Frecuencia de visita" nunca se abrevia
como "Frecuencia", y la columna se rotula "Reposición", nunca "Frecuencia". Un
proveedor sin `visit_frequency_days` muestra "Sin definir"; una asociación sin
`replenishment_frequency_days` muestra "Sin definir" en su columna. Nunca se
deriva una de la otra.

### D4 — La cantidad viaja como string decimal, con la unidad del producto como sufijo dentro del input

Decisión del usuario. El campo de cantidad muestra la unidad derivada de
`product.unit_type` del catálogo dentro del propio input: `15 kg` para
`pesable`, `24 un` para `unitario`. Aplica a los tres formularios que escriben
cantidad: crear pedido, recibir línea y alta de ítem no pedido. Un ítem de texto
libre no tiene producto de catálogo y por lo tanto se trata como `unitario`.

Alternativas descartadas: (a) una columna "unidad" aparte —agrega ancho en una
tabla que ya desborda a 320 px—; (b) dos campos distintos según el tipo —duplica
validación y rompe el orden de tabulación—; (c) dejar todo en unidades y
advertir —no resuelve el caso de uso, que es pedir 15,5 kg de pan—.

El sufijo es decorativo y **no forma parte del valor**: el input sigue siendo un
campo de texto con `inputMode="decimal"`, y la unidad se anuncia además en el
nombre accesible del campo ("Cantidad en kilogramos" / "Cantidad en unidades"),
porque un sufijo puramente visual no llega a un lector de pantalla.

**El mockup no cubre pesables**: todas sus cantidades son enteros con
`type="number"`. Esta decisión es un agregado sobre el diseño aprobado y **queda
marcada para validar con Claude Design** antes de darla por definitiva. Si esa
validación cambia la forma del control, cambia la presentación, no el contrato:
la cantidad sigue siendo un string decimal.

### D5 — La precisión decimal la define el backend; el frontend no la inventa

El frontend hoy ya maneja pesos con tres decimales en POS
(`isValidWeight`/`weightThousandths` en `src/lib/weightPricing.ts`) y el módulo
Inventory del backend ya opera con `decimal.Decimal`. **La escala válida para
purchasing es un dato a confirmar**, definido por la migración del backend
(bloque A de `backend-request.md`). Hasta que se confirme, la validación de
cantidad del frontend no se implementa con una escala fija: la tarea de
implementación está bloqueada por ese dato, y la validación local se escribe
contra la escala confirmada, no contra una supuesta.

Regla que sí es firme: la cantidad **nunca** se convierte a `float` ni se envía
como número JSON. Se envía como string decimal, igual que el dinero. Eso saca del
código `Number(input.quantity)` en `buildAddedItemPayload`
(`src/lib/receiving.ts`) y cambia la aritmética de vista previa de
`summarizePurchaseOrderDraft` (`src/lib/purchasing.ts:110-125`), que hoy
multiplica `item.quantity * toCents(item.unitCost)` con la cantidad como
`number`; pasa a operar sobre enteros escalados, con el mismo patrón que
`calculateWeightedPrice`. El total real sigue viniendo del backend; la vista
previa es sólo previa.

### D6 — "Qué llega hoy" incluye los atrasados; "Esta semana" es lo que viene después

Dos consultas al listado, ambas con `status=PENDING`:

| Bloque | Filtro | Contenido |
|---|---|---|
| Qué llega hoy | `expected_to = hoy` | Todo lo que debería haber llegado hasta hoy inclusive, es decir hoy **y** lo atrasado |
| Esta semana | `expected_from = mañana`, `expected_to = hoy + 6 días` | Lo que viene |

Un pedido de "Qué llega hoy" con fecha objetivo anterior a hoy se rotula
`Atrasado` con badge de texto e ícono, borde de card en tono de error y subtítulo
que dice hace cuánto venció. El encabezado del bloque cuenta ambos: "3 pedidos,
1 atrasado".

Alternativa descartada: un bloque "Atrasados" separado. El rediseño lo resuelve
dentro de "Qué llega hoy" porque la pregunta operativa a la mañana es una sola
—qué tengo que recibir— y partirla en tres listas empuja lo urgente hacia abajo.

Los pedidos pendientes **sin fecha objetivo** no aparecen en ninguno de los dos
bloques. Para que no se pierdan, el enlace del pie —"Ver todos los pedidos
pendientes (N) →"— lleva al historial con `status=PENDING` sin filtro de fecha
objetivo, y su contador se toma del `total` de esa consulta, no de la suma de los
dos bloques. Es la única forma de no ocultar los pedidos anteriores al despliegue
de `expected_at`, que nunca van a tener fecha objetivo.

### D7 — "Hoy" es el día calendario del negocio, no un instante

El cálculo de hoy y de los límites de la semana usa `todayISO()` y
`BUSINESS_TIME_ZONE` (`America/Argentina/Buenos_Aires`) de
`src/lib/salesSummary.ts`, que es el helper que el repo ya usa para rangos de
días. Los filtros viajan como `YYYY-MM-DD`, igual que `from`/`to`. "Atrasado" se
decide comparando días calendario, nunca instantes: un pedido con objetivo hoy no
pasa a atrasado a las 00:00 UTC. La clasificación se implementa como función pura
en `src/lib/purchasing.ts`, con `now` inyectable, y se testea en `node`.

### D8 — El gate de `/purchasing/[id]` se corrige y no se anticipa

Hoy el gate admite `cashier` sin que el backend lo acepte. La corrección es
**alinear**, no ampliar por adelantado:

- Mientras el bloque D del backend no esté desplegado, `cashier` **no** debe
  pasar el gate de `/purchasing/[id]` ni figurar en `NAV_ITEMS`.
- Una vez desplegado y verificado, `cashier` entra en la entrada de navegación de
  `/purchasing`, en el gate de `/purchasing` y en el de `/purchasing/[id]`.

En ningún momento intermedio se muestra una superficie que el backend rechace. El
gating del frontend es UX: la autorización real la aplica el backend, y este
change no la reemplaza ni la duplica como regla de negocio.

`cashier` **no** se agrega a `/purchasing/new`, `/purchasing/suppliers` ni
`/purchasing/suppliers/[id]`: la creación de pedidos y de proveedores sigue
siendo `admin | inventory` en el backend (`creationWrapped`).

### D9 — Fidelidad al diseño por traducción a tokens, nunca copiando hex

Cada valor del mockup ya corresponde a un token de `src/app/globals.css`. Se
implementa **traduciendo**, no copiando: el render sale idéntico y sobrevive a
`refactor-erp-pos-visual-system`, que va a mover esas variables. La tabla de
mapeo completa está en el digest del rediseño y se aplica sin excepciones
(`#7c3aed → --color-primary`, `#dcd9e6 → --color-border`,
`#211f2b → --color-text-primary`, `12px → --radius-app`, etc.).

Los cuatro valores del mockup que **no** son tokens y que tocan a este change:

- `#fca5a5` (borde de card en estado atrasado) → `--color-error` con opacidad, no
  un hex nuevo.
- `#15803d` / `#b45309` / `#dc2626` (texto oscuro sobre fondo teñido) → no existen
  como token; se resuelven con `color-mix` sobre los tokens de estado o con una
  variante `-strong` agregada al design system, decidido en el change hermano que
  toca los tokens. Este change **no** define hex sueltos.
- `#fffdf0` / `#a16207` / `#fde68a` (badge "★ Preferido" de la ficha de
  proveedor) → único lugar donde el diseño sale de la paleta; se reconcilia contra
  `--color-warning` antes de implementar.
- `#e5e2ee` (fondo de botón deshabilitado) → `--color-surface-2`.

No se porta nada de `support.js` del proyecto de diseño: es el runtime del canvas.
Tampoco se implementan la barra de pestañas del canvas ni los `<aside>` de
"Decisiones", que son memoria de diseño.

### D10 — El botón `Recibir` del hub navega, no recibe

En "Qué llega hoy" cada fila tiene un botón `Recibir` primario. Ese botón lleva al
detalle del pedido, donde vive la resolución línea por línea. Alternativa
descartada: recibir desde el hub. Recibir exige resolver cada línea con motivo
obligatorio y elegir medio de pago; comprimir eso en una fila del hub sería una
recepción a ciegas sobre stock real. El botón existe para acortar el camino, no
para saltarlo.

En "Esta semana" no hay CTA por fila: la fila entera abre el pedido, activable con
Enter, porque a esa altura la acción todavía no corresponde.

## UI states

**Ficha de proveedor**

- *Loading*: skeleton por card; las tres cargas son independientes y una lenta no
  bloquea a las otras.
- *Empty*: sin productos asociados → "Este proveedor todavía no tiene productos
  asociados." con la acción de asociar. Sin pedidos previos → "Todavía no hay
  pedidos a este proveedor." Sin datos de contacto → cada campo vacío muestra
  "Sin definir"; la card no desaparece.
- *Error*: si falla el proveedor, la pantalla muestra el mensaje del backend y una
  acción de reintentar, sin renderizar datos parciales. Si falla sólo una card
  secundaria (productos o pedidos), esa card muestra su error y su reintento, y el
  resto de la ficha sigue usable.
- *404*: proveedor inexistente → estado explícito con vuelta a la lista.
- *Success*: editar o desactivar muestra confirmación en español y **relee** la
  ficha; nunca estado optimista.

**Hub**

- *Loading*: skeleton de tres barras en "Qué llega hoy".
- *Empty*: sin pedidos para hoy → "No hay pedidos para recibir hoy."; sin pedidos
  esta semana → "No hay pedidos previstos para esta semana."; sin pendientes de
  ninguna clase → "No hay pedidos pendientes para recibir." más `Crear pedido`
  para quien puede crearlo. Los tres vacíos son distintos y no se confunden entre
  sí.
- *Error*: "No pudimos cargar los pedidos pendientes." más `Reintentar`,
  persistente y con el mensaje del backend; nunca un toast efímero.

**Nuevo pedido**

- La fecha objetivo vacía no bloquea la creación (el campo es opcional, igual que
  en el backend).
- Fecha objetivo anterior a la fecha de creación → aviso inline no bloqueante,
  porque puede ser legítimo cargar un pedido con retraso. La autoridad final es
  el backend: si lo rechaza, se muestra su mensaje inline y se conservan los
  valores tipeados.

**Detalle de pedido**

- Pedido sin `expected_at` → se muestra "Sin fecha objetivo"; no se renderiza una
  fecha vacía ni se oculta la línea entera.

## Keyboard and focus behavior

- La fila de "Esta semana" es activable con Enter y tiene foco visible; la fila de
  "Qué llega hoy" expone el botón `Recibir` como control real, tabulable, no un
  `div` con `onClick`.
- El orden de tabulación en la ficha de proveedor sigue el orden visual:
  encabezado y acciones → contacto → productos → pedidos.
- `Desactivar` abre diálogo con foco inicial en el control de cancelar (acción
  destructiva) y devuelve el foco a su trigger al cerrarse, con o sin confirmar.
- `Editar ficha` abre diálogo con foco inicial en el primer campo y retorno de
  foco al trigger.
- En los formularios de cantidad, el sufijo de unidad no es tabulable y no se
  intercala entre el campo de cantidad y el siguiente control: el orden
  cantidad → costo/motivo se mantiene exactamente como hoy.
- El campo `Fecha objetivo` se ubica inmediatamente después de `Fecha de
  creación` en el orden de tabulación.

## Responsive behavior

Desde 320 px, mobile-first. El caso de uso del cajero es explícitamente móvil:
recibe mercadería en el mostrador, con el teléfono.

- "Qué llega hoy": las filas grandes se apilan; nombre de proveedor, subtítulo,
  total y badge se reacomodan en columna y `Recibir` queda a ancho completo con
  altura de toque de al menos 44 px.
- "Esta semana": por debajo del breakpoint de tabla, cada fila colapsa en una
  tarjeta con proveedor, objetivo, total y estado; no se fuerza scroll horizontal
  de página.
- Ficha de proveedor: el grid de contacto de dos columnas pasa a una; la tabla de
  productos asociados colapsa en tarjetas con producto, preferido y reposición.
- Formularios de cantidad: el sufijo de unidad no puede empujar el input a
  desbordar; a 320 px el campo conserva ancho útil para tres dígitos y decimales.
- El teaser de últimos pedidos nunca introduce scroll horizontal: son tres filas
  de tres datos.

## Accessibility

- `Atrasado`, `Pendiente de alta` y el estado del pedido se comunican con texto en
  un `Badge`, no sólo por color ni sólo por borde. El borde en tono de error del
  pedido atrasado es refuerzo, no información.
- El badge "★ Preferido" tiene texto además del ícono; la estrella no comunica
  sola.
- Los campos nuevos del proveedor llevan `label` asociado: teléfono con
  `inputMode="tel"`, frecuencia de visita con `inputMode="numeric"`, notas como
  área de texto con su etiqueta.
- El teléfono se muestra en fuente monoespaciada (`--font-mono`) por legibilidad
  de dígitos; sigue siendo texto seleccionable, no una imagen.
- El campo de cantidad expone en su nombre accesible la unidad esperada, porque el
  sufijo visual no llega al lector de pantalla.
- El contador "3 pedidos, 1 atrasado" es texto, no sólo un badge de color.
- Foco visible en todos los controles nuevos; no se anula `prefers-reduced-motion`.

## API contract

Todo lo de esta sección **no existe todavía**. Está pedido en
`backend-request.md` y verificado como faltante el 2026-08-04.

**Proveedor**

- `POST /api/v1/suppliers` y `PUT /api/v1/suppliers/{id}` aceptan, además de
  `name`: `phone`, `address`, `visit_frequency_days` (entero nullable),
  `visit_notes`, `notes`. Todos opcionales.
- `GET /api/v1/suppliers/{id}` — **falta**. Devuelve el proveedor completo. La
  ficha lo necesita; sin él no hay ruta de detalle posible.
- `GET /api/v1/suppliers` puede seguir devolviendo el resumen.
- Errores esperados: `409` por nombre duplicado (constraint UNIQUE en
  `suppliers.name`) → mensaje inline conservando lo tipeado; `404` en el detalle;
  `403` para un rol sin permiso, con la sesión intacta; `401` sólo ante sesión
  inválida, que redirige a login.

**Pedido**

- `POST /api/v1/purchase-orders` acepta `expected_at` opcional.
- `GET /api/v1/purchase-orders` devuelve `expected_at` **en el list item**, no
  sólo en el detalle, y acepta los filtros `expected_from` / `expected_to`.
- `GET /api/v1/purchase-orders/{id}` devuelve `expected_at`.
- `expected_at` es **nullable para siempre**: los pedidos creados antes del
  despliegue no la tienen y nunca la van a tener.

**Cantidades**

- `quantity` y `received_quantity` viajan como **string decimal** —`"15.000"`—
  en el detalle, en la creación, en la recepción y en el alta de ítem no pedido.
  Nunca como número JSON.
- La escala exacta la define la migración del backend y es un dato a confirmar
  antes de implementar la validación del frontend (ver D5).

**Permisos**

- `cashier` se agrega a `GET /suppliers`, `GET /purchase-orders`,
  `GET /purchase-orders/{id}`, `POST /purchase-orders/{id}/receive`,
  `POST /purchase-orders/{id}/items` y
  `DELETE /purchase-orders/{id}/items/{item_id}`.
- `POST /purchase-orders` y los endpoints de alta/edición de proveedor **no**
  cambian: siguen `admin | inventory`.

**Tipos del frontend** (`src/lib/types.ts`)

- `Supplier`: suma `phone`, `address`, `visit_frequency_days`, `visit_notes`,
  `notes`, todos nullables. Puede aparecer un tipo aparte para el detalle si el
  listado se queda con el resumen.
- `PurchaseOrder` y `PurchaseOrderListItem`: suman `expected_at: string | null`.
- `PurchaseOrderItem`: `quantity` y `received_quantity` pasan de `number` a
  `string`.

## Error handling

- `401` — sesión inválida: redirección a login, comportamiento existente. No se
  confunde con falta de permiso.
- `403` — sesión válida sin permiso: se mantiene la sesión, se muestra la falta de
  permiso y un retorno. **Objetivo explícito de este change:** el `403` que hoy ve
  un cajero al abrir un pedido deja de producirse en origen, corrigiendo el gate y
  ampliando el permiso del backend, no maquillándolo con un mensaje más lindo.
- `404` — proveedor o pedido inexistente: estado propio con vuelta a la lista.
- `409` — nombre de proveedor duplicado, o recepción concurrente ya resuelta por
  otra persona: mensaje del backend inline y relectura del dato autoritativo.
- `400`/`422` — validación del backend (motivo faltante, cantidad inválida,
  escala decimal excedida, fecha objetivo rechazada): mensaje inline junto al
  campo, valores tipeados conservados, sin traducir ni reinterpretar el mensaje.
- Falla de carga de una card secundaria de la ficha: error local con reintento; no
  tumba la pantalla.
- Una mutación con resultado ambiguo no se asume exitosa ni se reintenta sola: se
  relee el dato autoritativo.

## Backend coordination

Ver `backend-request.md`. Resumen del bloqueo:

| Bloque | Sin backend | Consecuencia |
|---|---|---|
| A — cantidades decimales | `Quantity int` en dominio y en los 3 DTOs | Un pesable no se puede pedir; el sufijo `kg` sería mentira |
| B — datos y detalle de proveedor | `Supplier{ID,Name,Active}`, sin `GET /suppliers/{id}` | La ficha no tiene qué mostrar ni de dónde leerlo |
| C — `expected_at` y filtros | Sin campo ni filtro | "Qué llega hoy" no tiene definición |
| D — permisos del cajero | `receivingWrapped` sin `cashier` | Toda superficie que se le abra devuelve `403` |

El bloque D contiene además una **decisión de producto pendiente del lado del
backend**: ampliar `receivingWrapped` significa que el cajero pasa a ver todo el
historial de compras, los costos de proveedor y la inversión del negocio. La
alternativa acotada es un endpoint con permiso propio limitado a los pedidos con
`expected_at` de hoy en estado `PENDING`. Si se elige la alternativa, cambia el
endpoint que consume el hub para el rol `cashier`, y este change se actualiza
antes de implementarse. No es una decisión que el frontend pueda tomar.

## Risks / Trade-offs

- **El campo nuevo llega `undefined` y no rompe la compilación** → si el frontend
  lee `expected_at` antes de que el backend lo emita, no hay error de tipos: hay
  una UI vacía en producción. Mitigación: orden de despliegue backend-primero y
  verificación contra instancia real como tarea explícita.
- **Ampliar permisos al cajero expone costos de compra** → mitigación: la decisión
  se toma en backend antes de tocar `nav.ts`; el frontend no despliega ninguna
  superficie nueva para `cashier` hasta que el permiso exista.
- **Cambiar `quantity` de `number` a `string` es transversal** → toca tipos,
  `buildAddedItemPayload`, la vista previa del borrador y los tres formularios.
  Mitigación: la aritmética se concentra en `src/lib/purchasing.ts` con enteros
  escalados y tests en `node`, siguiendo el patrón ya probado de
  `weightPricing.ts`.
- **Dos changes tocando las mismas requirements** → mitigación: orden obligatorio
  (hermano primero) y rebase del delta antes de archivar.
- **El sufijo de unidad no está validado por diseño** → mitigación: se marca como
  decisión a validar con Claude Design; el contrato de datos no depende de esa
  validación.
- **Un pedido sin proveedor no tiene ficha** → si
  `add-frontend-purchasing-optional-supplier` se implementa antes, el enlace al
  proveedor desde el detalle del pedido debe ausentarse en ese caso, no apuntar a
  una ruta vacía.

## Migration Plan

1. Backend despliega el bloque A (cantidades decimales). Se verifica contra
   instancia real y se confirma la escala al frontend.
2. Backend despliega B (campos de proveedor y `GET /suppliers/{id}`) y C
   (`expected_at` + filtros). Se verifican shape y nullabilidad.
3. Se toma la decisión de producto del bloque D y se despliega el permiso
   elegido. Se verifica con un usuario `cashier` real que
   `GET /purchase-orders/{id}` ya no devuelve `403`.
4. `redesign-frontend-purchasing-section` está implementado y sus specs
   sincronizadas (incluida la fusión de `ui-receiving`).
5. Recién entonces se implementa este change, en el orden de `tasks.md`: tipos y
   helpers puros → ficha de proveedor → fecha objetivo y hub → cantidades →
   navegación y gates del cajero.
6. `cashier` se agrega a `NAV_ITEMS` y a los gates **al final**, después de
   verificar el permiso contra el backend real.

## Rollback

- Bloques B y C son aditivos en la UI: revertir el frontend deja al backend con
  campos que nadie escribe ni lee, sin corromper datos.
- El bloque D se revierte quitando `cashier` de `NAV_ITEMS` y de los gates; los
  pedidos ya recibidos por un cajero quedan registrados y son válidos.
- El bloque A **no es aditivo**: si se revierte el frontend con el backend ya
  migrado a decimal, los formularios volverían a enviar números y el backend
  podría rechazarlos. Por eso A se despliega primero y se revierte último, y su
  reversión implica revertir también el backend.

## Open Questions

No bloqueantes. Todas se pueden cerrar durante la implementación sin cambiar
alcance, contrato ni roles:

1. Copy exacto de la ayuda inline de `Fecha objetivo`: "(cuándo debería llegar)"
   viene del mockup y se usa tal cual salvo mejor propuesta.
2. Si el teaser de la ficha muestra los tres últimos pedidos de cualquier estado o
   sólo los cerrados. El mockup muestra estado en cada fila, lo que sugiere
   cualquiera.
3. Si la ventana de "Esta semana" son 7 días corridos desde mañana o hasta el
   domingo. Se implementa como 7 días corridos salvo indicación en contra.
4. Si la ficha de proveedor se enlaza también desde el detalle de un pedido, y no
   sólo desde la lista.
5. Cómo se rotula exactamente una frecuencia de visita en días cuando no es
   múltiplo de 7 ("cada 10 días").
