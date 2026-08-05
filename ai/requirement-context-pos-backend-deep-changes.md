# Requirement Context: puntos del grupo (b) "requiere backend" del análisis POS (Claude Design)

Este documento cubre dos changes distintos que surgen del mismo análisis
origen que `improve-pos-checkout-flow` (ya implementado, grupo (a)
sólo-frontend). El grupo (b) tenía 5 puntos; el descubrimiento contra el
backend real mostró que **sólo 3 de los 5 requieren backend de verdad**. Los
otros 2 (split de pago N-tramos + Transferencia, búsqueda server-side de
productos) ya están soportados por el backend desplegado y se resuelven en un
change frontend-only aparte (no cubierto por este documento).

Decisión del usuario: dos changes de backend, no uno.

- **Change 1 — `pos-atomic-sale-confirmation`**: venta atómica. Solo, por ser
  el de mayor riesgo/retorno y requerir su propio diseño de contrato y
  rollout.
- **Change 2 — `pos-draft-recovery-and-stock-in-product`**: descarte de
  drafts huérfanos + `stock` en la respuesta de producto. Bundleados porque
  ambos son pedidos de backend acotados, sin relación entre sí más allá de
  tocar el mismo `PosView.tsx`.

---

## Objective

**Change 1**: eliminar la clase de fallos parciales de la confirmación de
venta (draft huérfano si falla a mitad de camino) reemplazando la secuencia
de 4 llamadas HTTP secuenciales (`POST /sales` → N × `POST /sales/{id}/items`
→ `PUT /sales/{id}/payment` → `POST /sales/{id}/confirm`) por una operación
atómica.

**Change 2**: (a) darle al cajero una salida real para una venta en `draft`
que ya no quiere completar (hoy sólo puede quitar sus líneas una por una, no
existe "descartar venta"); (b) evitar el segundo round-trip
(`GET /inventory/stock/{product_id}`) que hoy retrasa el tope de stock de
cada producto nuevo escaneado, incluyendo el `stock` directamente en la
respuesta de producto.

## Current behavior

**Confirmación de venta** (`src/components/pos/PosView.tsx`, `confirmSale`,
vía `src/lib/posSaleSubmission.ts` `submitSale`): secuencia de 4 llamadas.
Evidencia de esta misma sesión: `POST /sales/{id}/confirm` devolvió un `500`
real dos veces contra el backend local, confirmando que la clase de fallo
parcial no es hipotética. El frontend ya retiene el `sale.id` entre
reintentos (`improve-pos-checkout-flow`, Decisión 12) para no duplicar el
draft, pero eso no evita que un draft quede huérfano si el cajero abandona la
venta (cierra la pestaña, refresca) antes de reintentar.

**Drafts huérfanos**: `GET /api/v1/sales` con `status=draft` **ya existe y
funciona** — `../backend/internal/sales/application/list_sales.go`
(`ListSalesInput.Status`, default `"confirmed"`, acepta `"draft"`) y
`../backend/internal/bootstrap/router.go:192-206` (`registerSalesListRoutes`,
comentario: "único que puede devolver drafts", abierto a `admin`/`cashier`,
un cajero sólo ve las suyas — scope forzado en el caso de uso). El frontend
no lo consume para nada relacionado a recuperación de drafts hoy. No existe
ningún endpoint para **descartar** un draft: `grep DELETE` en
`../backend/internal/sales/transport/http/routes.go` sólo tiene
`DELETE /sales/{id}/items/{item_id}` (quitar un ítem), no
`DELETE /sales/{id}`. Tampoco hay un caso de uso `Cancel`/`Discard`/`Void`
sobre una venta.

El único tratamiento actual de un fallo de red total (`status === 0`) es
`unknownNetworkState` en `PosView.tsx`, renderizado por
`src/components/pos/CheckoutStatus.tsx` (rama `kind === "network"`) como un
texto plano de advertencia — **no** ofrece ningún link a "ventas recientes"
ni ninguna acción hoy (contra lo que sugería el doc de análisis original,
que asumía ese paliativo ya implementado; no lo está).

**Stock en escaneo**: `src/components/pos/PosView.tsx` (`addToCart`,
`availableStock`) hace `GET /inventory/stock/{product_id}` en paralelo tras
resolver el producto (ya no bloqueante desde `improve-pos-checkout-flow`,
Decisión 2), cacheado por producto en `stockByProduct`. El `productResponse`
del backend (`../backend/internal/catalog/transport/http/dto.go:76-94`) no
tiene ningún campo de stock — se verificó línea por línea, no está.

## Desired behavior

**Change 1:**
- WHEN el cajero confirma una venta con carrito y pago válidos, THEN una
  sola operación crea la venta, sus ítems y su pago, y la confirma —
  sin dejar un draft parcial si algo falla a mitad de camino.
- WHEN esa operación falla, THEN no queda ningún registro parcial en el
  backend que el cajero deba descubrir o limpiar después.

**Change 2 (drafts):**
- WHEN el cajero tiene una venta en curso que ya no quiere completar (y no
  quiere quitar cada línea a mano), THEN puede descartarla explícitamente
  y el backend la elimina o la marca como no recuperable.
- WHEN el cajero abre el POS y tiene uno o más drafts propios abandonados de
  una sesión anterior (visible vía `GET /sales?status=draft`, ya
  disponible), THEN puede verlos y decidir: descartarlos o continuar
  cobrando la venta original a partir de ese draft (retomar no requiere
  backend nuevo — ya se puede seguir posteando ítems/pago/confirm sobre un
  `id` de venta existente).

**Change 2 (stock en producto):**
- WHEN el POS resuelve un código de barras o un resultado de búsqueda,
  THEN la respuesta ya trae el stock disponible de ese producto, sin una
  segunda llamada.

## Primary actor

`cashier` (rol `admin` también opera el POS). Sin cambios de rol en ninguno
de los dos changes: las rutas de venta ya son "cualquier rol autenticado,
ownership verificado en el caso de uso"
(`router.go:192-197`, comentario explícito).

## Roles and permissions

Sin cambios. `POST /sales`, `POST /sales/{id}/items`,
`PUT /sales/{id}/payment`, `POST /sales/{id}/confirm` no tienen
`RequireRole` propio — cualquier sesión autenticada, con ownership forzado en
el caso de uso (el cajero sólo opera sus propias ventas). `GET /sales` (para
listar drafts) ya está gateado a `admin`/`cashier`
(`registerSalesListRoutes`). El endpoint de descarte de draft (Change 2)
debería seguir el mismo criterio de ownership que ya usa
`RegisterPaymentsUseCase`/`ConfirmSaleUseCase` (`sale.IsOwnedBy(cashierID)`),
pero backend decide.

## Main user flow

Sin cambios de alto nivel en ninguno de los dos changes: escanear/buscar →
carrito → medio de pago → confirmar (Change 1, mismo flujo, menos pasos de
red internos) o escanear/buscar (Change 2b, mismo flujo, un round-trip
menos). Change 2a agrega un flujo nuevo y acotado: abrir el POS con uno o
más drafts propios pendientes → ver la lista → descartar o continuar cada
uno.

## UI states

**Change 1**: el estado `pending`/`Confirmando…` ya existente no cambia de
forma observable — sigue mostrando el mismo spinner durante la operación,
ahora más corta (una llamada en vez de hasta 4 + N). El error de
confirmación (`role="alert"`, "Reintentar"/"Volver" por `error.kind`) sigue
existiendo para cuando la operación atómica falla.

**Change 2a**: falta definir dónde vive la lista de drafts pendientes
(¿modal al entrar al POS con drafts propios? ¿banner dismisseable?) — ver
preguntas bloqueantes.

**Change 2b**: sin estado nuevo — el tope de stock (mensaje, prioridad de
`resolveEntryStatus`) ya existe; sólo cambia de dónde sale el dato (mismo
response en vez de una segunda llamada).

## Keyboard and focus behavior

Sin cambios en Change 1 y 2b (mismos flujos, foco no se toca). Change 2a: si
hay una lista de drafts al entrar al POS, necesita su propio modelo de foco
— no definido todavía (bloqueante si Change 2a se especifica en detalle
ahora, ver preguntas).

## Responsive behavior

Sin requisitos nuevos más allá de los ya vigentes en `ui-pos` (mismo layout,
mismos breakpoints).

## Accessibility expectations

Sin requisitos nuevos específicos más allá de los ya vigentes (`role="alert"`
en errores de confirmación, foco visible). Si Change 2a agrega un modal de
drafts pendientes, hereda las convenciones ya usadas por `Dialog`
(`src/components/ui/Dialog.tsx`).

## Copy and feedback

No definido todavía para Change 2a (copy de "descartar venta", confirmación
o no de esa acción — dado que ya existe el patrón "Vaciar carrito" con
diálogo de confirmación en `ui-pos`, lo más consistente es replicarlo, pero
es una decisión de diseño, no bloqueante para el backend-request).

## Backend dependencies

**Change 1 — bloqueante, no existe ningún atajo parcial**: ningún endpoint
acepta ítems o pagos en la creación (`CreateSaleUseCase.Execute` sólo toma
`cashierID`, sin ítems: `../backend/internal/sales/application/create_sale.go`).
Se necesita diseño de contrato nuevo — ver `Backend dependencies` en
`backend-request.md` de este change.

**Change 2a — bloqueante, parcial**: `GET /sales?status=draft` ya existe
(no bloqueante). Falta un endpoint de descarte
(`DELETE /sales/{id}` o equivalente) — no existe hoy.

**Change 2b — bloqueante**: `productResponse` no expone `stock`. Se necesita
el campo nuevo en `GET /products`, `GET /products/{id}` y
`GET /products/barcode/{barcode}`.

## API contract

Verificado contra `../backend/internal/bootstrap/router.go` y los casos de
uso/DTOs correspondientes:

- `POST /api/v1/sales` — existe, sin ítems/pago (`create_sale.go`).
- `POST /api/v1/sales/{id}/items` — existe.
- `PUT /api/v1/sales/{id}/payment` — existe, **ya acepta N pagos con
  `TRANSFER` incluido**, sin límite de longitud
  (`register_payments.go`: valida método y monto por ítem, ninguna
  validación de cantidad — irrelevante para estos dos changes, relevante
  para el change frontend-only de split de pago, documentado aparte).
- `POST /api/v1/sales/{id}/confirm` — existe.
- `GET /api/v1/sales?status=draft` — **existe y funciona**
  (`list_sales.go`, scoped a cajero).
- `DELETE /api/v1/sales/{id}` — **no existe** (Change 2a, a pedir).
- Contrato atómico (`POST /sales` con ítems+pago+confirmación, o un
  endpoint nuevo) — **no existe** (Change 1, a pedir; forma exacta a
  definir por backend).
- `stock` en `productResponse` (`GET /products`, `GET /products/{id}`,
  `GET /products/barcode/{barcode}`) — **no existe**
  (`../backend/internal/catalog/transport/http/dto.go:76-94`, Change 2b, a
  pedir).

## Data types

**Change 1**: `src/lib/types.ts` `Sale` no cambia de forma si el contrato
atómico devuelve el mismo shape que `POST /sales/{id}/confirm` ya devuelve
hoy (`Sale`); a confirmar contra el contrato que backend proponga.

**Change 2b**: `Product`/`ProductList` en `src/lib/types.ts` ganarían un
campo `stock` (forma exacta — número, o `{ available, reserved }`, etc. — a
definir por backend).

## Error behavior

Sin cambios de patrón en ninguno de los dos changes: mensajes `{ message }`
tal como llegan, `403` → "Volver", resto → "Reintentar" (ya normativo,
`improve-pos-checkout-flow`, Decisión 11).

## Edge cases

**Change 1**: ¿qué pasa con stock insuficiente descubierto recién al
confirmar (hoy es un 409 al momento de `POST /sales/{id}/confirm`, después
de que los ítems ya se agregaron)? En la versión atómica, ese chequeo tiene
que ocurrir dentro de la misma transacción — a definir por backend, pero el
frontend necesita saber si el error de stock insuficiente en la operación
atómica identifica la línea afectada (ya lo hace hoy el flujo de 4 pasos,
ver `ui-pos` spec, "Blocked reason names the affected line").

**Change 2a**: ¿qué pasa con un draft cuyos productos cambiaron de precio o
se desactivaron entre que se creó y que el cajero lo retoma? Mismo criterio
ya establecido para el carrito restaurado de `sessionStorage`
(`improve-pos-checkout-flow`, requirement "A restored line with a stale
price is not blocked client-side"): el backend sigue siendo la autoridad al
confirmar, el frontend no bloquea preventivamente.

**Change 2b**: ¿el `stock` en la respuesta de listado (`GET /products`) es
el mismo dato ya cacheado/agregado que hoy expone
`GET /inventory/stock/{product_id}`, o puede quedar desactualizado en un
listado de 100 productos? A confirmar con backend — afecta si el frontend
puede confiar en ese campo para el tope de stock o necesita seguir
revalidando en algún punto.

## Affected routes

Ninguna ruta nueva. `src/app/(app)/page.tsx` (POS) sin cambios de ruta.

## Affected components

`src/components/pos/PosView.tsx` (ambos changes), `src/lib/posSaleSubmission.ts`
(Change 1, reemplaza o simplifica la secuencia de `submitSale`),
`src/components/pos/CheckoutStatus.tsx` (Change 1, el error atómico sigue el
mismo patrón de `role="alert"`/recuperación). Change 2a probablemente agrega
un componente nuevo (lista/diálogo de drafts pendientes) — nombre y
ubicación a definir en `design.md`, no en este documento.

## Affected libraries

`src/lib/posSaleSubmission.ts`: si el contrato atómico reemplaza la
secuencia de 4 pasos, esta función se simplifica drásticamente (una sola
llamada en vez de orquestar 4). `src/lib/types.ts`: `Sale`/`Product` según
el contrato final que backend proponga.

## Affected capabilities

`ui-pos` (delta spec) en ambos changes — comportamiento de confirmación
(Change 1), y de escaneo/entrada + una capability nueva de "gestión de
drafts pendientes" si Change 2a llega a ese nivel de detalle (Change 2).

## Testing implications

**Change 1**: si `posSaleSubmission.ts` se simplifica a una sola llamada,
sus tests actuales (`posSaleSubmission.test.ts`, guarda anti-duplicado) se
reducen o se reemplazan — la guarda de "no duplicar draft" deja de tener
sentido si no hay pasos intermedios que puedan fallar parcialmente. A
revisar en `design.md` de Change 1, no bloqueante para el backend-request.

**Change 2b**: sin lógica nueva testeable en `lib/` más allá de leer un
campo nuevo del tipo `Product` ya existente.

## Deployment considerations

Ambos changes son **estrictamente posteriores** al despliegue y verificación
del contrato de backend correspondiente contra una instancia real — ningún
frontend se implementa ni se mockea antes (mismo criterio que
`add-frontend-purchasing-optional-supplier/backend-request.md`, ya usado en
este repo).

## Out of scope

- Split de pago N-tramos + Transferencia y búsqueda server-side de
  productos: **no van en estos dos changes** — ya están soportados por el
  backend actual (`PUT /sales/{id}/payment` sin límite de tramos con
  `TRANSFER` válido; `GET /products?q=` ya implementado y sin consumidor),
  van en un change frontend-only aparte, sin `backend-request.md`.
- Cualquier cambio a roles, rutas o layout del POS.
- Recuperación automática/silenciosa de un draft sin acción explícita del
  cajero.
- Reimpresión/compartir comprobante, últimas 3 ventas del turno, chips de
  billetes frecuentes, cantidad por teclado en el omnibox (nice-to-have (c)
  del análisis original, ningún punto de éstos es parte de este documento).

## Decisions made

- Dos changes de backend separados, no uno (decisión del usuario en esta
  sesión): Change 1 = venta atómica, sola. Change 2 = descarte de drafts +
  stock en producto, juntos.
- El split de pago N-tramos/Transferencia y la búsqueda server-side quedan
  para un tercer change, frontend-only, sin backend-request (decisión del
  usuario).

## Remaining non-blocking questions

1. **Change 1 — forma exacta del contrato atómico**: ¿un solo
   `POST /sales` que reciba `items[]` + `payments[]` y confirme en una
   transacción, reemplazando la secuencia actual? ¿o un endpoint nuevo
   (`POST /sales/atomic` o similar) que coexista con el flujo de 4 pasos
   para permitir editar un draft antes de confirmar? Esto lo decide backend
   como parte de responder el `backend-request.md`; el frontend no lo
   inventa. Afecta directamente el `design.md` de Change 1 una vez que
   backend responda.
2. **Change 1 — ¿el flujo de 4 pasos se deprecia o convive?** Si conviene
   mantenerlo (p. ej. para permitir que el cajero arme el carrito
   incrementalmente contra el backend antes de confirmar, en vez de todo
   junto al final), el contrato atómico sería sólo para el paso final de
   confirmación. A definir junto con el punto 1.
3. **Change 2a — nivel de detalle de la UI de drafts pendientes**: este
   documento no resuelve dónde vive esa lista ni su copy exacto — es una
   decisión de diseño que puede resolverse en el `design.md` de Change 2
   una vez que el backend-request esté respondido, no bloquea escribir el
   `backend-request.md` en sí (que sólo necesita el endpoint de descarte).

## Evidence consulted

- `openspec/specs/ui-pos/spec.md` (vigente, tras `improve-pos-checkout-flow`).
- `openspec/changes/improve-pos-checkout-flow/` (`proposal.md`, `design.md`,
  `tasks.md`) — grupo (b) diferido explícitamente ahí.
- `ai/context/module-map.md` (sección POS).
- `ai/context/api-contract.md` (endpoints de Sales y Products documentados
  como consumidos).
- `src/components/pos/PosView.tsx`, `CheckoutStatus.tsx`,
  `src/lib/posSaleSubmission.ts`, `src/lib/paymentComposition.ts`,
  `src/lib/types.ts` (`Sale`).
- `../backend/internal/bootstrap/router.go` (rutas de Sales, Products,
  Inventory).
- `../backend/internal/sales/transport/http/routes.go`,
  `application/create_sale.go`, `application/list_sales.go`,
  `application/register_payments.go`, `domain/sale.go`.
- `../backend/internal/catalog/transport/http/handler.go`,
  `transport/http/dto.go` (`productResponse`, `ListProducts`).
- Evidencia en vivo de esta sesión: dos `500` reales de
  `POST /sales/:id/confirm` contra el backend local durante la verificación
  manual de `improve-pos-checkout-flow`.
- `openspec/changes/add-frontend-purchasing-optional-supplier/backend-request.md`
  (formato de referencia para `backend-request.md`).
