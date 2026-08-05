## Context

Este change bundlea dos pedidos de backend acotados, del mismo análisis
origen que `improve-pos-checkout-flow` (grupo (b), "requiere backend"),
elegidos juntos porque ambos son ajustes pequeños que no ameritan un change
propio cada uno, no porque tengan una relación funcional entre sí.

**Drafts huérfanos**: `GET /api/v1/sales?status=draft` **ya existe y
funciona** —
`../backend/internal/sales/application/list_sales.go`
(`ListSalesInput.Status`, acepta `"draft"`) y
`../backend/internal/bootstrap/router.go:192-206`
(`registerSalesListRoutes`, comentario explícito: "único que puede devolver
drafts", `admin`/`cashier`, scope de cajero forzado en el caso de uso). No
existe ningún endpoint de descarte: `DELETE /sales/{id}` no está en
`../backend/internal/sales/transport/http/routes.go`, y no hay ningún caso
de uso `Cancel`/`Discard`/`Void` en `internal/sales/application/`.

**Stock en producto**: `productResponse`
(`../backend/internal/catalog/transport/http/dto.go:76-94`) no tiene ningún
campo de stock, verificado línea por línea. El POS hoy dispara
`GET /inventory/stock/{product_id}` en paralelo al agregar un `unitario` por
primera vez en el turno (`improve-pos-checkout-flow`, Decisión 2), cacheado
por producto en `stockByProduct` (`src/components/pos/PosView.tsx`) —
sólo se pide una vez por producto por sesión de POS.

Ninguno de los dos contratos existe hoy en el backend desplegado. Este
documento describe el comportamiento deseado una vez que cada contrato
(`## API contract`) se despliegue y se verifique; no se implementa ni se
mockea antes de esa verificación.

## Goals / Non-Goals

**Goals:**

- Dar al cajero una acción explícita para descartar una venta en `draft`
  que ya no quiere completar.
- Mostrar los drafts propios abandonados de una sesión anterior al entrar al
  POS, con la opción de descartarlos o retomarlos.
- Eliminar el segundo round-trip de stock para el primer escaneo de cada
  producto `unitario`, usando el campo `stock` de la respuesta de producto.

**Non-Goals:**

- No implementa venta atómica ni cambia la secuencia de confirmación —
  cubierto por `pos-atomic-sale-confirmation`, change independiente.
- No agrega stock a la respuesta para productos `pesable`: `ui-pos` ya
  establece que un `pesable` nunca se chequea contra stock
  ("Weighable products are not checked against stock"); ese requirement no
  cambia.
- No cambia el comportamiento de "Vaciar carrito" (vacía el carrito local
  sin llamar al backend) — descartar un draft es una acción de backend
  distinta, sobre una venta que ya existe ahí.
- No implementa un historial de drafts descartados ni una papelera.
- No cambia roles, rutas ni el layout del POS.

## User flow

**Descarte de draft en curso:**

1. El cajero tiene un carrito con al menos una línea y ya llamó a
   `POST /sales` (existe un `sale.id` para esta venta en curso) — o el
   escenario equivalente de "Vaciar carrito" ya cubre el caso sin venta
   creada todavía.
2. El cajero activa "Descartar venta" (o el nombre que confirme el diseño
   final), confirma en un diálogo (mismo patrón que `ClearCartDialog`), y el
   backend elimina o marca como no recuperable la venta en `draft`.
3. El carrito local se vacía igual que "Vaciar carrito"; el foco vuelve al
   campo de escaneo.

**Drafts pendientes de una sesión anterior:**

1. El cajero abre el POS. Si `GET /sales?status=draft` devuelve uno o más
   drafts propios, se le ofrece verlos (superficie exacta — modal al
   entrar, banner dismisseable — a definir, ver "Open Questions").
2. Por cada draft: puede descartarlo (mismo endpoint del punto anterior) o
   retomarlo. Retomar no requiere backend nuevo: el frontend recupera los
   ítems/pago ya registrados en ese `sale.id` (si el endpoint de listado los
   expone, o vía `GET /sales/{id}`) y continúa el flujo de confirmación
   normal sobre esa venta existente.

**Stock en escaneo:**

1. El cajero escanea o busca un producto `unitario` por primera vez en el
   turno. La respuesta ya incluye `stock`; el frontend puebla
   `stockByProduct` directamente desde ahí, sin disparar
   `GET /inventory/stock/{product_id}`.
2. El resto del comportamiento no cambia: la línea aparece de inmediato, el
   tope se aplica si corresponde, con el mismo mensaje ya normativo.

## UI states

- **Empty (sin drafts pendientes):** al entrar al POS sin drafts propios,
  no se muestra ninguna superficie nueva — comportamiento idéntico al
  actual.
- **Drafts pendientes:** definido en "Open Questions" — no bloquea el
  `backend-request.md`, que sólo necesita el endpoint de descarte.
- **Loading/Error (stock en producto):** sin cambio de patrón — un error de
  producto (barcode/búsqueda) sigue mostrando el mismo mensaje ya normativo;
  la ausencia de `GET /inventory/stock` como llamada separada no introduce
  un estado de carga nuevo.

## Keyboard and focus behavior

Descartar un draft en curso sigue el mismo modelo de foco que "Vaciar
carrito" (`improve-pos-checkout-flow`, Decisión 13): abrir el diálogo
interrumpe el foco deliberadamente, cerrarlo por cualquier medio devuelve el
foco al campo de escaneo o al botón que lo abrió, según corresponda. El
modelo de foco para la superficie de drafts pendientes al entrar al POS
queda sin definir (ver "Open Questions") — no bloquea el `backend-request.md`.

## Responsive behavior

Sin requisitos nuevos más allá de los ya vigentes en `ui-pos`. La superficie
de drafts pendientes, cuando se diseñe, debe seguir siendo usable en ancho
de móvil, mismo criterio que el resto del POS.

## Decisions

### 1. Descartar un draft es una acción de backend, no un vaciado local

A diferencia de "Vaciar carrito" (que sólo limpia estado del cliente y
`sessionStorage`, sin tocar el backend si no se llegó a crear la venta),
descartar un draft opera sobre una venta que **ya existe** en el backend
(`sale.id` obtenido de un `POST /sales` anterior). Necesita su propio
endpoint porque no hay forma de eliminar o invalidar una venta `draft` hoy.

### 2. Retomar un draft no requiere backend nuevo

Continuar cobrando una venta ya creada es, en esencia, seguir invocando
`POST /sales/{id}/items`/`PUT /sales/{id}/payment`/`POST /sales/{id}/confirm`
(o la operación atómica de `pos-atomic-sale-confirmation`, si ese change ya
está implementado) sobre el `sale.id` del draft encontrado — el mismo patrón
que ya usa la guarda de reintento de `improve-pos-checkout-flow`. Esto no se
pide en `backend-request.md`: sólo el descarte requiere un endpoint nuevo.

### 3. El `stock` de producto no reemplaza el chequeo de `pesable`

`ui-pos` ya establece que un `pesable` nunca se chequea contra stock. El
campo `stock` que se agrega a la respuesta de producto es relevante sólo
para líneas `unitario`; para `pesable` puede venir `null`/ausente sin que
el frontend lo trate como error — se documenta como parte del contrato en
`backend-request.md`.

### 4. `stockByProduct` se puebla desde la respuesta de producto cuando está presente

`addToCart`/`availableStock` (`PosView.tsx`) verifican primero si el
producto resuelto (barcode o búsqueda) ya trae `stock`; si sí, lo usa
directamente y no dispara `GET /inventory/stock/{product_id}`. Si el campo
viene ausente (por ejemplo, mientras el rollout de backend está en curso o
para un caso no cubierto), el frontend conserva el comportamiento actual
como fallback — no se rompe si el campo no llega, hasta que backend lo
garantice de forma consistente.

Alternativa descartada: exigir el campo siempre presente y tratar su
ausencia como error. Introduciría una dependencia frágil de un despliegue
perfectamente sincronizado; el fallback es más seguro para el rollout.

## API contract

**Bloqueado, parcial** — se documenta como faltante en `backend-request.md`:

- Descarte de draft: no existe hoy ningún endpoint. Forma exacta
  (`DELETE /sales/{id}`, o un `POST /sales/{id}/discard`, etc.) a decisión
  de backend.
- `stock` en `productResponse` (`GET /products`, `GET /products/{id}`,
  `GET /products/barcode/{barcode}`): no existe hoy. Forma exacta (entero
  simple, o `{ available, reserved }`, etc.) a decisión de backend.

**Ya disponible, sin pedido nuevo:**

- `GET /sales?status=draft`: ya existe y funciona, scoped a cajero.

## Error handling

Sin cambio de patrón general. El descarte de un draft que el backend
rechace (por ejemplo, si mientras tanto ya se confirmó desde otra sesión)
muestra el mensaje `{ message }` tal como llega, sin asumir éxito.

## Backend coordination

Bloqueado parcialmente. Ver `backend-request.md` para el contrato mínimo
solicitado (descarte de draft, `stock` en producto) y el criterio de
desbloqueo. El listado de drafts no se pide porque ya existe.

## Risks / Trade-offs

- [Contrato de descarte no verificado] → ninguna llamada ni mock se
  construye antes de verificar una instancia real; las tareas dependientes
  quedan bloqueadas en `tasks.md`.
- [Forma del campo `stock` no verificada] → mismo criterio; el frontend no
  asume su shape hasta que backend la confirme.
- [Ausencia de superficie de drafts pendientes definida en detalle] → se
  documenta como pregunta abierta de diseño, no bloquea el pedido a backend,
  que sólo necesita el endpoint de descarte.
- [Compatibilidad entre `pos-atomic-sale-confirmation` y "retomar un
  draft"] → si ese change ya está implementado cuando se implemente éste,
  retomar un draft debe usar la operación atómica para el resto del flujo;
  si no, usa el flujo de 4 pasos actual. Ninguno de los dos changes depende
  del orden de implementación del otro, pero la implementación de "retomar"
  debe verificar cuál flujo está vigente en ese momento.

## Migration Plan

1. Backend implementa y despliega el endpoint de descarte de draft y el
   campo `stock` en la respuesta de producto, cada uno verificable de forma
   independiente.
2. Frontend implementa la acción de descarte (bloqueada por el punto 1
   parcial) y el consumo de `stock` en producto (bloqueada por el punto 1,
   la otra mitad) — pueden implementarse en cualquier orden entre sí.
3. La superficie de drafts pendientes al entrar al POS se diseña en detalle
   una vez que el endpoint de descarte esté verificado (no antes, para no
   diseñar contra un contrato hipotético).

## Rollback

Si el frontend se revierte, el backend puede mantener ambos contratos
desplegados sin romper el frontend previo: un draft sin descartar sigue
comportándose como hoy (huérfano, sin acción posible desde el POS previo), y
un `stock` presente en la respuesta de producto que el frontend previo no
lee simplemente se ignora. No hay estado persistido nuevo del lado del
frontend que revertir.

## Open Questions

- Superficie exacta para drafts pendientes al entrar al POS (modal
  bloqueante, banner dismisseable, badge con detalle bajo demanda): se
  resuelve en una revisión de diseño una vez que el endpoint de descarte
  esté verificado; no bloquea `backend-request.md`.
- Copy exacto de "Descartar venta" y su diálogo de confirmación: sugerido
  seguir el mismo patrón que `ClearCartDialog` ("Se van a eliminar..."),
  ajustable sin cambiar el comportamiento observable.
- Si el endpoint de descarte devuelve algún cuerpo o sólo un status de
  éxito: no bloquea el pedido, se documenta como parte de la respuesta de
  backend cuando se implemente.
