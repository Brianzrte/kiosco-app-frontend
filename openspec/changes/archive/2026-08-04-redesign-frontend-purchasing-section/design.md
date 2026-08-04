# Design — Rediseño de la sección Compras y proveedores

## Context

La persona usuaria aprobó un rediseño completo de la sección, maquetado en el
proyecto Claude Design **`1669eca0-5224-4459-8b68-524eb6c00266`
("Rediseño de Compras y Proveedores")**, con los archivos `PurchasingHub.dc.html`,
`PurchaseOrderDetail.dc.html`, `AddUncatalogedItem.dc.html`,
`SupplierDetail.dc.html` y `NewPurchaseOrder.dc.html`.

**El markup exacto se re-baja del proyecto con DesignSync (`get_file`) al
momento de implementar.** Este documento no lo transcribe a propósito: pegar
HTML acá lo congela y lo desincroniza del origen. `support.js` del proyecto es
el runtime del canvas de diseño (resuelve `<x-dc>`, `style-hover`, `sc-if`,
`sc-for`) y **no se porta nada de ahí**.

Estado verificado hoy (`2026-08-04`):

- `/purchasing` es el hub real; `/suppliers`, `/receiving` y `/receiving/[id]`
  son `redirect()` a las rutas de `purchasing`.
- `src/components/receiving/ReceivingListView.tsx` es un re-export de una línea
  de `PurchasingHubView` y no lo importa nadie (`grep` sobre `src/`).
- `openspec/specs/ui-receiving/spec.md` sigue exigiendo una sección en
  `/receiving` y navegación a `/receiving/[id]`: describe una realidad que ya
  no existe.
- `src/components/purchasing/PurchaseOrderForm.tsx` tiene 932 líneas y ya
  contiene cinco componentes internos.
- Las sugerencias de reposición **ya viven en el formulario de pedido**, no en
  el hub: lo que el rediseño cambia es su jerarquía (pasan a ayuda secundaria
  al pie) y el teaser que el hub agrega hacia ellas.
- El backend de purchasing no cambia: todas las rutas usadas existen en
  `../backend/internal/bootstrap/router.go:157-190`.

## Goals / Non-Goals

### Goals

1. Adoptar la estructura visual aprobada en hub, nuevo pedido, detalle de
   pedido y alta de ítem no pedido, **traduciendo el mockup a tokens**.
2. Que armar un pedido recurrente parta del último pedido al proveedor, sin
   backend nuevo y sin inventar la noción persistente de "plantilla".
3. Convertir la recepción en un flujo de resolución línea por línea, donde el
   motivo bloquea antes de intentar y donde se ve qué falta para poder
   confirmar.
4. Dejar la sección con una sola capability y una sola familia de rutas.
5. Partir `PurchaseOrderForm.tsx` **antes** de sumarle comportamiento.

### Non-Goals

- Fecha objetivo, "Qué llega hoy" / "Esta semana" / "Atrasado", ficha de
  proveedor, cantidades decimales para pesables y permisos de `cashier`: todo
  eso vive en `add-frontend-purchasing-supplier-data-and-scheduling` y depende
  de backend.
- Restyling de `/purchasing/suppliers` y `/purchasing/history`: el rediseño no
  las maqueta.
- La pantalla de cola de ítems pendientes de alta
  (`GET /purchase-orders/uncatalogued-items`, admin, hoy sin consumidor).
- Eliminar los stubs de redirect: se conservan.
- Cualquier cálculo de sugerencia de reposición o de totales en el navegador.

## Fidelidad al diseño: traducir a tokens, nunca copiar hex

El mockup se generó con la paleta de la app: cada valor que usa **ya es** un
token declarado en `src/app/globals.css` (verificado uno por uno). Se
implementa traduciendo, no copiando: el render sale idéntico y sobrevive a
`refactor-erp-pos-visual-system`, que está en vuelo y **mueve exactamente estas
variables**. Un hex pegado en una clase Tailwind quedaría congelado en el valor
viejo el día que ese change aterrice, y además viola la regla 7 de `AGENTS.md`
(sólo tokens del design system, nada de estilo ad-hoc por pantalla).

| Mockup | Token |
|---|---|
| `#7c3aed` | `--color-primary` |
| `#6d28d9` | `--color-primary-hover` |
| `#5b21b6` | `--color-primary-active` |
| `#ede9fe` | `--color-primary-light` |
| `#c4b5fd` | `--color-secondary` |
| `#f8f8fb` | `--color-background` |
| `#ffffff` | `--color-surface` |
| `#fcfbfd` | `--color-surface-subtle` |
| `#ece9f7` | `--color-surface-2` |
| `#f3f1f9` | `--color-surface-hover` |
| `#dcd9e6` | `--color-border` |
| `#c9c5db` | `--color-border-hover` |
| `#b3aec9` | `--color-border-strong` |
| `#211f2b` | `--color-text-primary` |
| `#615e6e` | `--color-text-secondary` |
| `#736f85` | `--color-text-muted` |
| `#a6a2b3` | `--color-text-disabled` |
| `#22c55e` | `--color-success` |
| `#f59e0b` | `--color-warning` |
| `#ef4444` | `--color-error` |
| radio `12px` | `--radius-app` |
| radio `8px` | `--radius-tight` |
| `0 1px 2px rgba(31,41,55,.04), 0 2px 8px rgba(31,41,55,.06)` | `--shadow-soft` |
| `Geist` / `Geist Mono` | `--font-sans` / `--font-mono` |

### Elementos del mockup que NO se implementan

- La barra superior con las 5 pestañas ("1. Hub", "2. Detalle"…): es navegación
  del canvas de diseño; la app tiene su propio shell.
- Los `<aside>` "Decisiones" / "Decisiones de jerarquía" / "La fila de
  recepción": son memoria de diseño, no UI.
- En `AddUncatalogedItem`, la segunda card con `opacity:0.55` rotulada "Vista
  alternativa": documenta el modo texto libre, no es un segundo bloque.
- `SupplierDetail.dc.html` completo: es del change 2.

## Decisions

### D1 — "Plantilla" = precarga del último pedido, derivada en una función pura

`GET /purchase-orders?supplier_id=X&page=1&limit=1` ordena por `ordered_at DESC`
(verificado en `../backend/internal/purchasing/infrastructure/purchase_order_list_queries.go:61`),
así que devuelve el pedido más reciente de ese proveedor; su detalle sale de
`GET /purchase-orders/{id}`. Ambos existen y están autorizados para admin e
inventory, que son los únicos roles que pueden crear pedidos.

La transformación pedido-anterior → borrador vive en `src/lib/purchasing.ts`
como función pura y testeable en Vitest (environment `node`), no en la view: es
donde están las reglas de exclusión y es lo único realmente testeable
automáticamente de todo el change.

**Alternativa descartada:** pedirle al backend una entidad "plantilla". Agrega
contrato, migración y una segunda fuente de verdad para algo que el historial
ya responde. Queda registrado en el `backend-request.md` del change 2 como
explícitamente innecesario.

### D2 — Qué se precarga y qué no

La función excluye una línea del pedido anterior cuando:

| Motivo | Por qué |
|---|---|
| `removed_at` presente | ya se decidió que no iba en aquel pedido |
| sin `product_id` (ítem de texto libre) | `POST /purchase-orders` exige `product_id`; no es representable |
| producto inactivo en el catálogo cargado | el spec vigente excluye inactivos de pedidos nuevos |
| producto ausente del catálogo cargado | sin producto no hay combobox editable ni `product_id` confiable |

Cada exclusión se reporta con su motivo en el banner, con el nombre que traía
el pedido anterior (`product_name`). **Nada se descarta en silencio.** Se
precargan cantidad y costo unitario del pedido anterior, ambos editables.

Un pedido anterior `CANCELLED` **sí** sirve como origen: significa que no llegó
nada, que es justamente cuando se quiere volver a pedir lo mismo. El banner
nombra la fecha del pedido de origen para que la decisión sea visible.

**Trade-off aceptado:** el formulario carga hoy `GET /products?limit=100`. Si
el catálogo supera ese tamaño, una línea válida puede caer en "no encontrado en
el catálogo". Se prefiere no precargar y decirlo, antes que precargar una línea
fantasma sin producto editable. Subir o paginar esa carga es un problema propio
del catálogo, fuera de este change (ver `Open Questions`).

### D3 — La precarga no pisa trabajo ya hecho

La precarga corre al elegir o cambiar de proveedor **sólo si el borrador está
pristino** (ninguna línea con producto elegido). Si ya hay trabajo cargado, en
vez de reemplazarlo se ofrece una acción explícita `Traer el último pedido`, y
la precarga reemplaza el borrador únicamente cuando la persona la activa.
Reemplazar en silencio sería destruir datos tipeados sin confirmación.

### D4 — La resolución línea por línea es estado local; se envía en un solo `POST /receive`

Ésta es la resolución del **desajuste documentado en la sección 3 del digest**:
el mockup ofrece `Deshacer` sobre `Sacar línea`, pero hoy sacar una línea es
`DELETE /purchase-orders/{id}/items/{item_id}`, inmediato e irreversible, y el
backend no tiene endpoint para revertirlo.

Se resuelve mapeando las tres acciones del mockup al **contrato de recepción**,
que ya expresa las tres:

| Acción del mockup | Payload en `POST /purchase-orders/{id}/receive` |
|---|---|
| `Recibí todo` | `received_quantity = quantity`, sin motivo |
| `Recibí menos` | `0 < received_quantity < quantity` + `non_delivery_reason` |
| `No lo trajo` (la acción en tono error) | `received_quantity = 0` + `non_delivery_reason` |

Con ese mapeo las tres acciones son estado local hasta el confirmar, `Deshacer`
funciona para las tres, y no hay ninguna mutación parcial que revertir.

El propio pie del mockup confirma este mapeo: "todas resueltas y nada recibido
→ `Confirmar y cancelar pedido`" es exactamente lo que hace
`ValidateReception` (`../backend/internal/purchasing/domain/purchase_order.go`):
si ningún ítem tiene cantidad recibida mayor a cero, el pedido cierra
`CANCELLED`. Si `Sacar línea` fuera el `DELETE`, un pedido con todas las líneas
"sacadas" se quedaría sin ítems activos y el `POST /receive` — que exige
`items` con `min=1` — ni siquiera podría enviarse.

**Consecuencia de copy:** la acción en tono error se rotula **`No lo trajo`**,
no `Sacar línea`, y su barra resuelta dice `No entregado · Motivo: …`. Rotular
`Sacar línea` una acción que deja el ítem en el pedido con cantidad recibida 0
sería mentirle a quien recibe, y lo confundiría con la baja real de ítem (D5),
que produce un registro distinto (`removed_at` + tachado).

**Alternativas descartadas:**

- *Acumular los `DELETE` en cliente y dispararlos antes del `POST /receive`*:
  la secuencia no es atómica. Si el `receive` falla después de los borrados, las
  bajas ya quedaron aplicadas con motivo y sin forma de deshacerlas.
- *Quitar `Deshacer` del mockup*: se perdería la propiedad más valiosa del
  rediseño — que nada se envía hasta confirmar — por una limitación que el
  contrato de recepción no tiene.

### D5 — La baja de ítem (`DELETE`) sobrevive como acción distinta y secundaria

Sigue haciendo falta: es la única forma de sacar del pedido una línea que no
debería estar (por ejemplo, un ítem agregado por error con `Agregar ítem no
pedido`). Se conserva como acción secundaria por línea, rotulada
`Quitar del pedido`, con su diálogo de motivo obligatorio, inmediata y **sin
`Deshacer`**, porque el backend no ofrece reversión. Las líneas dadas de baja
salen del área de resolución y se muestran tachadas con su motivo, como hoy.

**Alternativa descartada:** sacar el `DELETE` de la UI. Sería remover
comportamiento vigente y especificado, que el rediseño no pidió remover.

### D6 — El método de pago y el aviso de "qué se registra" quedan en un diálogo de confirmación

El mockup del detalle sólo muestra el botón de confirmar en el pie: no dice
dónde va el método de pago, que el backend exige siempre
(`receivePurchaseOrderRequest.PaymentMethod` es `validate:"required"`), ni el
aviso obligatorio por spec de que la recepción registra usuario, fecha y hora,
cantidades, movimientos de stock y cierre del pedido.

Se parte el diálogo actual en dos: **las cantidades y motivos suben a la
pantalla** (resolución inline) y el diálogo queda liviano, con el resumen de lo
que se va a registrar, el selector de método de pago y el confirmar. Así se
conserva el requirement vigente y el manejo de foco de `Dialog`, sin
contradecir el mockup — que sobre este punto no dice nada.

Cuando no se recibe nada, el diálogo mantiene el método de pago (el contrato lo
exige) y lo explica: se guarda con el pedido aunque no ingrese mercadería.

### D7 — El estado de resolución sobrevive a las relecturas del pedido

Agregar un ítem no pedido o dar de baja una línea relee el pedido
(`GET /purchase-orders/{id}`), patrón vigente y no negociable: el total siempre
viene del backend. La resolución local se guarda **por `item_id`**, así que tras
la relectura se conservan las líneas ya resueltas, las líneas que dejaron de
estar activas se descartan y el ítem recién agregado entra como no resuelto —
lo que baja el contador "N de M" y vuelve a deshabilitar el confirmar. Es el
comportamiento correcto: acaba de aparecer una línea sin decidir.

### D8 — La resolución local no inventa estado de ítem

El requirement vigente "Purchase-order detail exposes backend item audit fields"
prohíbe fabricar en el navegador un campo genérico de estado del ítem. La
resolución de D4 **no es** ese campo: es borrador previo al envío, existe sólo
hasta el confirmar y no se muestra como dato del pedido. Lo que el detalle
muestra como estado del ítem —cantidad recibida, motivo de no entrega, baja y
motivo— sigue viniendo del backend después de la relectura.

### D9 — El subtítulo de la fila del hub no lleva cantidad de ítems

El mockup pone "N ítems · objetivo hoy, 4 ago." como subtítulo de cada fila.
Ninguna de las dos mitades es representable con el contrato actual:
`GET /purchase-orders` devuelve `{id, supplier_name, ordered_at, total, status,
received_at?, received_by?, has_uncatalogued_items}` — **no trae cantidad de
ítems**, y la fecha objetivo es del change 2. Traer la cantidad implicaría un
`GET /purchase-orders/{id}` por fila, que es inaceptable para una lista.

Decisión: el subtítulo muestra la fecha del pedido (`ordered_at`), que sí está
en el listado. La cantidad de ítems queda como pedido eventual al backend en el
change 2, junto con `expected_at`, si se la sigue queriendo.

### D9bis — El hub no pide sugerencias; sólo enlaza

El teaser de sugerencias del mockup muestra un contador ("5 productos bajos de
stock"). Traerlo implicaría llamar `GET /purchase-orders/suggestions` desde el
hub, que es **admin + inventory** (`router.go:189` del bloque `creationWrapped`):
un usuario `receiving` cobraría `403` en una pantalla que sí puede usar, y
sería un request extra para un dato que el formulario ya carga.

Decisión: el teaser se renderiza **sin contador**, sólo para los roles que
pueden crear pedidos, y enlaza a `/purchasing/new`, donde las sugerencias viven
de verdad. **Alternativa descartada:** pedir sugerencias en el hub sólo para
admin/inventory — resuelve el 403 pero suma un request y una segunda fuente del
mismo dato para ganar un número.

### D10 — Las sugerencias conservan sus dos secciones

El mockup dibuja una sola lista de sugerencias con badge de conteo y botón
`Usar N`. El spec vigente exige dos secciones ("Bajos de stock" y "Datos de
planificación incompletos", con su búsqueda y su alta manual de cantidad). Se
adopta el tratamiento visual del mockup (ayuda secundaria al pie, badge con el
conteo de bajos de stock, fila con explicación del backend y acción `Usar N`) y
**se conservan las dos secciones**: el mockup no pidió eliminar la segunda, y
quitarla dejaría sin camino a los productos que el backend no puede calcular.

### D11 — Fusión de `ui-receiving` en `ui-suppliers-purchasing`

`ui-receiving` manda construir contra `/receiving`, que hoy es un redirect. En
vez de corregir las rutas dentro de una capability que ya no tiene superficie
propia, sus requirements se re-alojan en `ui-suppliers-purchasing` — que es
donde vive el resto de la sección — y `ui-receiving` queda sin requirements.

Los stubs `/suppliers`, `/receiving` y `/receiving/[id]` **se conservan**: son
tres archivos de una línea y borrarlos rompe links y marcadores externos sin
ganar nada.

### D12 — El split de `PurchaseOrderForm.tsx` va primero y no cambia comportamiento

Se extraen los cinco componentes que ya existen dentro del archivo
(`PurchaseOrderItemRow`, `ProductCombobox`, `SupplierAssociationCheck`,
`IncompleteDataSuggestionItem` → `ReplenishmentSuggestionsPanel`,
`PurchaseOrderConfirmationModal`) a archivos propios en
`src/components/purchasing/`, **sin tocar su lógica**, y recién después se suma
la precarga. Un paso de movimiento puro es verificable con `npm run build` +
`npm run lint` y deja el diff del comportamiento nuevo legible.

### D13 — Tres tokens nuevos para el texto sobre fondo teñido

Las barras de línea resuelta (recibido completo / parcial / no entregado) ponen
texto de color sobre un fondo del mismo matiz al 10 %. Los tokens
`--color-success`, `--color-warning` y `--color-error` son demasiado claros ahí
y no alcanzan contraste AA.

Decisión del usuario (2026-08-04): **definir tres tokens explícitos** en
`src/app/globals.css`, con los valores del mockup —
`--color-success-strong: #15803d`, `--color-warning-strong: #b45309`,
`--color-error-strong: #dc2626` — en vez de derivarlos con `color-mix()`. Se
prioriza contraste garantizado y control sobre derivación automática.

Son los únicos hex nuevos que este change introduce. Entran **como token**, y
todo consumo pasa por la variable: ningún componente escribe el hex. Quedan
documentados junto a los tokens de estado existentes para que
`refactor-erp-pos-visual-system` los encuentre cuando revise la paleta.

## User flow

### A. Armar un pedido recurrente (admin / inventory)

1. Hub → `Crear pedido` (encabezado).
2. Elegir proveedor en la card superior.
3. El formulario precarga las líneas del último pedido a ese proveedor y
   muestra el banner de precarga editable con la fecha del pedido de origen y,
   si corresponde, qué líneas no se precargaron y por qué.
4. Ajustar cantidades y costos, quitar líneas, agregar productos, o tomar una
   sugerencia de reposición del bloque inferior.
5. `Crear pedido` → resumen de confirmación vigente → `POST /purchase-orders` →
   redirect al detalle creado.

### B. Recibir la mercadería (admin / inventory / receiving)

1. Hub → fila del pedido → `Recibir` (o abrir el detalle).
2. Banner de advertencia fijo: cada línea necesita una acción, y si no se
   recibe nada el pedido se cancela.
3. Por línea: `Recibí todo` / `Recibí menos` / `No lo trajo`. Las dos últimas
   abren un panel inline con el motivo obligatorio; el confirmar de esa línea
   queda deshabilitado mientras el motivo esté vacío.
4. La línea resuelta colapsa a una barra teñida con el resultado y `Deshacer`.
5. Si llegó algo no pedido: `Agregar ítem no pedido` (catálogo o texto libre).
6. Pie: "N de M líneas resueltas" + total + confirmar en su estado
   correspondiente → diálogo con método de pago → `POST .../receive` →
   relectura del pedido.

## UI states

| Superficie | Loading | Empty | Error | Success / pending |
|---|---|---|---|---|
| Hub · pendientes | skeleton de 3 filas card | "No hay pedidos pendientes para recibir." + `Crear pedido` para quien puede crear; vacío por filtro distinguido del vacío real (spec vigente) | "No pudimos cargar los pedidos pendientes." + `Reintentar`, sin lista parcial | — |
| Nuevo pedido · precarga | indicador dentro del bloque de productos, sin bloquear proveedor ni fecha | "Es el primer pedido a este proveedor. Agregá los productos a mano." | aviso **no bloqueante**: el formulario queda usable vacío y se puede reintentar la precarga | banner de precarga con conteo de líneas y exclusiones |
| Detalle · resolución | `LoadingState` vigente | pedido sin líneas activas: se explica que no hay nada para recibir y no se ofrece confirmar | error de carga con `Reintentar`; error de mutación inline, conservando la resolución local | confirmar con `pending`; toast en español + relectura |
| Alta de ítem no pedido | — | búsqueda de catálogo sin resultados: mensaje que ofrece el modo texto libre | mensaje del backend inline, conservando lo tipeado | toast + relectura del pedido |

## Keyboard and focus behavior

- **Precarga**: el foco permanece en el selector de proveedor. El banner de
  precarga se anuncia por región `aria-live="polite"`; no roba foco.
- **Quitar una línea del borrador**: el foco va al botón de quitar de la línea
  siguiente, o al botón `Agregar producto` si era la última. Nunca al `body`.
- **Pestañas de modo** en el alta de ítem: patrón tabs — flechas ←/→ mueven
  entre pestañas, la activa es la única tabulable, `aria-selected` refleja el
  modo.
- **Resolución por línea**: las tres acciones son botones alcanzables por
  `Tab` en orden de lectura. Al abrir el panel inline, el foco va al primer
  campo del panel (cantidad en `Recibí menos`, motivo en `No lo trajo`). Al
  confirmar la línea, el foco vuelve al botón `Deshacer` de esa misma línea. Al
  activar `Deshacer`, vuelve a la acción original de la línea.
- **Diálogos** (`Quitar del pedido`, confirmación de recepción): `Dialog` ya
  gestiona el foco y devuelve al trigger al cerrar sin navegación. Se conserva.
- Ninguna acción depende de hover.

## Responsive behavior

Mobile-first desde 320 px (AGENTS.md).

- **Hub**: las filas card apilan proveedor/subtítulo arriba y total + estado +
  `Recibir` abajo; el bloque de filtros y el teaser pasan de dos columnas a
  una. Nada de scroll horizontal a nivel página.
- **Nuevo pedido**: la tabla editable de productos ya tiene tratamiento de
  lista apilada en móvil; el botón de quitar línea se mantiene siempre visible,
  con `aria-label="Quitar línea"` y target táctil ≥44 px.
- **Detalle**: la card de línea apila nombre + datos y pone las tres acciones
  en fila de ancho completo, 44 px de alto, sin recortar el texto del botón.
  El panel inline de motivo ocupa el ancho completo de la card. El pie
  (contador + total + confirmar) se apila.
- El caso de uso es explícitamente móvil: quien recibe está en el mostrador con
  el teléfono.

## Accessibility

- Estado de pedido y de línea nunca sólo por color: badge con texto
  (`Pendiente`, `Recibido`, `Cancelado`, `Pendiente de alta`) y barra resuelta
  con su leyenda escrita.
- Las tres acciones de línea llevan **ícono + texto + color**, nunca color
  solo.
- El contador "N de M líneas resueltas" vive en una región `aria-live="polite"`
  para que un lector de pantalla sepa cuánto falta.
- El motivo obligatorio se marca con `required`, `aria-describedby` hacia la
  leyenda de bloqueo ("Completá el motivo para confirmar esta línea.") y el
  botón deshabilitado con `aria-disabled` explicando por qué.
- Una línea dada de baja va tachada **y** rotulada con su motivo en texto.
- El banner de advertencia del detalle es texto permanente, no `role="alert"`:
  no interrumpe, ya está al abrir.
- Las pestañas de modo usan `role="tablist"`/`tab`/`tabpanel` con
  `aria-selected`.
- Foco visible en todos los controles nuevos; no se anula
  `prefers-reduced-motion`.

## API contract

Todo verificado el `2026-08-04` contra
`../backend/internal/bootstrap/router.go:157-190`,
`internal/purchasing/transport/http/dto.go` y
`internal/purchasing/domain/purchase_order.go`. **No se usa ningún endpoint
nuevo.**

| Método y path | Roles backend | Uso en este change |
|---|---|---|
| `GET /suppliers` | admin, inventory, receiving | selector de proveedor y filtros |
| `GET /purchase-orders?supplier_id&from&to&status&page&limit` | admin, inventory, receiving | hub (`status=PENDING`) y último pedido (`limit=1`) |
| `GET /purchase-orders/{id}` | admin, inventory, receiving | detalle y origen de la precarga |
| `POST /purchase-orders` | admin, inventory | creación (sin cambios de payload) |
| `GET /purchase-orders/suggestions` | admin, inventory | sugerencias en el formulario |
| `POST /purchase-orders/{id}/receive` | admin, inventory, receiving | confirmación de la resolución |
| `POST /purchase-orders/{id}/items` | admin, inventory, receiving | alta de ítem no pedido |
| `DELETE /purchase-orders/{id}/items/{item_id}` | admin, inventory, receiving | baja de ítem con motivo |
| `GET /products` | catálogo | validación de la precarga y combobox |

Notas de contrato que condicionan la UI:

- `GET /purchase-orders` ordena por `ordered_at DESC`; `page=1&limit=1` es "el
  último pedido".
- `receivePurchaseOrderRequest` exige `payment_method` y `items` con `min=1`.
  Cada item es `{item_id, received_quantity (int, >= 0), non_delivery_reason?}`.
- `ValidateReception` rechaza `received_quantity > quantity` y exige motivo
  cuando `received_quantity < quantity`. La UI valida lo mismo antes de enviar,
  pero **el backend es la autoridad** y su mensaje se muestra tal cual.
- Si ningún ítem tiene cantidad recibida > 0, el pedido cierra `CANCELLED`.
- `removePurchaseOrderItemRequest.Reason` es `required`, **sin excepción de
  rol**: el admin tampoco puede saltearlo.
- Cantidades de compra son enteras de punta a punta. Los pesables quedan para
  el change 2; este change no introduce decimales.
- Dinero: strings decimales, `formatMoney()` para mostrar y `toCents`/
  `fromCents` para cualquier subtotal del borrador. El total del pedido creado
  o recibido **siempre** viene del backend.
- Fechas: `ordered_at` es RFC3339; `<input type="date">` se convierte con
  `toOrderedAtPayload()`. Sin conversión de zona implícita en la view.

## Error handling

- `401`: sesión inválida → el proxy/`requireRole` redirige a login. No se
  maquilla como error de la pantalla.
- `403`: sesión válida sin permiso → se muestra el mensaje del backend con la
  vuelta al hub; no se reintenta.
- `409` al confirmar la recepción (alguien la cerró antes): se muestra el
  mensaje y se relee el pedido; si ya no está `PENDING`, el área de resolución
  se reemplaza por el resumen de recepción.
- `400` por motivo faltante o cantidad inválida: la UI ya bloquea antes, pero
  si llega, el mensaje va inline en el diálogo de confirmación, sin perder la
  resolución local.
- Falla de la precarga (cualquier status): **no bloquea**. Aviso no bloqueante
  y formulario usable, con acción para reintentar la precarga.
- Falla ambigua de una mutación: no se asume éxito ni se reintenta solo; se
  relee el pedido y se muestra el estado autoritativo.

## Backend coordination

**Ninguna.** Todos los endpoints, roles, shapes y validaciones que este change
usa existen y están desplegados; por eso **no se crea `backend-request.md`**.
Las necesidades reales de backend (fecha objetivo, datos de proveedor,
decimales, permisos de cajero) pertenecen a
`add-frontend-purchasing-supplier-data-and-scheduling` y están documentadas
allí.

## Risks / Trade-offs

- **`refactor-erp-pos-visual-system` declara un delta sobre `ui-receiving`
  ("Receiving workspace hierarchy") y este change vacía esa capability.** →
  Mitigación: la fusión se registra en el delta con `Reason` y `Migration`, y
  quien cierre cualquiera de los dos changes debe re-alojar ese requirement en
  `ui-suppliers-purchasing` antes de archivar. Este change **no edita** el otro
  change; la coordinación queda como tarea de prerrequisito.
- **`/purchasing/[id]` sigue permitiendo `cashier` en su `requireRole` mientras
  el backend responde `403`.** → Es un bug vivo y conocido; su corrección
  depende de la decisión de permisos del cajero, que pertenece al change 2
  (bloque D del `backend-request` de esa rama). Este change no lo toca para no
  adelantar esa decisión de producto.
- **El rework del detalle es el cambio funcional más grande.** → Mitigación:
  toda la aritmética y el armado del payload salen a `src/lib/purchasing.ts`
  con tests; la view queda como composición. Verificación manual obligatoria
  del flujo completo contra backend real.
- **La precarga puede dejar líneas afuera por el `limit=100` del catálogo.** →
  Mitigación: se nombran una por una en el banner con su motivo; nada
  desaparece en silencio.
- **`add-frontend-purchasing-optional-supplier` hará opcional el proveedor.** →
  Sin proveedor no hay precarga posible: la precarga sólo corre cuando hay
  `supplier_id`. Compatible por construcción.
- **Riesgo de regresión al partir un archivo de 932 líneas.** → Mitigación:
  paso de movimiento puro, sin cambios de lógica, validado con build + lint
  antes de sumar comportamiento.

## Valores del mockup que no son tokens — decisiones abiertas

Ninguno se implementa con un hex suelto. **Se resuelven antes de escribir el
CSS de la pantalla que los usa**; si la resolución exige un token nuevo, es una
decisión de la persona usuaria, no del implementador.

| Valor del mockup | Dónde aparece | Estado |
|---|---|---|
| `#fca5a5` | borde de card en estado atrasado/error | El estado "atrasado" es del change 2. Cuando haga falta, se resuelve con `--color-error` a opacidad reducida (`border-error/40`), nunca con el hex. |
| `#15803d`, `#b45309`, `#dc2626` | texto de success/warning/error sobre fondo teñido (barras de línea resuelta) | **Resuelto (decisión del usuario, 2026-08-04)**: se definen tres tokens explícitos `--color-success-strong: #15803d`, `--color-warning-strong: #b45309` y `--color-error-strong: #dc2626` en `src/app/globals.css`, con los valores del mockup. No se derivan con `color-mix()`: se eligió control y contraste garantizado sobre los fondos teñidos por encima de la derivación automática. Son los únicos hex nuevos que este change introduce, y entran como token, nunca inline. Ver D-tokens abajo. |
| `#fffdf0`, `#a16207`, `#fde68a` | badge "★ Preferido" de la ficha de proveedor | Único lugar donde el mockup sale de la paleta. Pertenece al change 2; se reconcilia contra `--color-warning` allá. |
| `#e5e2ee` | fondo de botón deshabilitado | Cercano a `--color-surface-2`. Se verifica contraste del texto deshabilitado antes de adoptarlo; si no alcanza, se decide token nuevo. |

## Migration Plan

1. Mover `ReceivingDetailView.tsx` y `AddPurchaseOrderItemForm.tsx` a
   `src/components/purchasing/`, actualizar el import de
   `src/app/(app)/purchasing/[id]/page.tsx` y borrar `ReceivingListView.tsx`.
   Sin cambios de comportamiento.
2. Partir `PurchaseOrderForm.tsx` (D12). Sin cambios de comportamiento.
3. Agregar los helpers puros a `src/lib/purchasing.ts` con sus tests.
4. Adoptar la estructura visual pantalla por pantalla: hub → nuevo pedido +
   precarga → detalle + resolución → alta de ítem.
5. Verificación manual completa contra backend real, incluido un pedido que
   cierra `CANCELLED`.

No hay cambio de contrato, ni de datos persistidos, ni orden de despliegue con
backend: cada paso es desplegable por separado.

## Rollback

Cada paso es un revert de frontend sin efecto sobre datos: no hay migración, no
hay estado persistido nuevo y no hay endpoint nuevo. Revertir el paso 4 deja el
diálogo de recepción anterior funcionando contra el mismo contrato. Lo único no
trivial de revertir es la fusión de capabilities, que es documental y se
deshace restaurando `openspec/specs/ui-receiving/spec.md` desde git.

## Open Questions

No bloqueantes; se resuelven durante la implementación o en un change posterior:

1. ¿Se renombra `ReceivingDetailView.tsx` a `PurchaseOrderDetailView.tsx` al
   mudarlo? Se movió con el nombre actual para respetar el alcance pedido; el
   rename es cosmético y puede ir en el mismo paso si no agrega ruido al diff.
2. ¿`src/lib/receiving.ts` se absorbe en `src/lib/purchasing.ts`? Hoy duplican
   la etiqueta de estado (`statusLabel` vs `purchaseOrderStatusLabel`). Fuera
   de alcance; queda anotado.
3. ¿La entrada de navegación `/purchasing`, hoy rotulada "Proveedores", pasa a
   "Compras"? El mockup no incluye el shell de la app.
4. Copy exacto de la ayuda del método de pago cuando no se recibe nada.
5. Elevar o paginar el `GET /products?limit=100` del formulario, que hoy acota
   tanto el combobox como la precarga.
