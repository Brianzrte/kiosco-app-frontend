## Context

Confirmar una venta hoy es una secuencia de hasta 4 llamadas HTTP
secuenciales orquestadas por `src/lib/posSaleSubmission.ts` (`submitSale`),
invocada desde `confirmSale()` en `src/components/pos/PosView.tsx`:
`POST /sales` → N × `POST /sales/{id}/items` → `PUT /sales/{id}/payment` →
`POST /sales/{id}/confirm`. Cada llamada es una oportunidad de fallo parcial
independiente. `improve-pos-checkout-flow` (Decisión 12, ya implementado)
agregó una guarda para que un reintento no duplique el `sale.id` ya creado,
pero eso sólo evita el draft duplicado — no evita que un draft quede
huérfano si el cajero no reintenta (cierra la pestaña, navega a otra
pantalla). Esta sesión reprodujo dos veces un `500` real de
`POST /sales/{id}/confirm` contra el backend local, confirmando que la clase
de fallo que motiva este change ocurre de verdad.

Ninguna operación atómica existe hoy en el backend desplegado:
`CreateSaleUseCase.Execute` (`../backend/internal/sales/application/create_sale.go`)
sólo toma `cashierID`, sin ítems ni pago. Este documento describe el
comportamiento deseado una vez que el contrato ampliado (`## API contract`)
se despliegue y se verifique; no se implementa ni se mockea antes de esa
verificación, siguiendo el mismo criterio que
`add-frontend-purchasing-optional-supplier/backend-request.md`.

Este change es independiente de
`pos-draft-recovery-and-stock-in-product` (el otro change del mismo
análisis origen, para descarte de drafts + `stock` en la respuesta de
producto): ambos tocan `PosView.tsx` pero sobre superficies distintas
(confirmación vs. entrada/gestión de drafts) y no se pisan.

## Goals / Non-Goals

**Goals:**

- Reemplazar la secuencia de 4 llamadas de confirmación por una operación
  atómica: si falla, no queda ningún registro parcial (venta, ítems o pago)
  en el backend.
- Simplificar `posSaleSubmission.ts` en consecuencia — sin guarda de
  "retener el `sale.id` entre reintentos" si ya no hay pasos intermedios que
  puedan fallar por separado.
- Preservar el comportamiento observable ya normativo de errores de
  confirmación (`role="alert"`, "Volver" para `403`, "Reintentar" para el
  resto) sobre la nueva operación.

**Non-Goals:**

- No define si el backend implementa la atomicidad como un endpoint nuevo o
  como una ampliación de uno existente — es una decisión de backend, sujeta
  a lo que responda `backend-request.md`.
- No cambia el flujo de agregar/editar líneas del carrito antes de
  confirmar (`addToCart`, edición de peso/precio real): eso sigue ocurriendo
  del lado del cliente, sin llamadas al backend hasta la confirmación.
- No implementa recuperación de drafts huérfanos ya existentes en el
  backend (cubierto por `pos-draft-recovery-and-stock-in-product`).
- No cambia roles, rutas ni el layout de columnas del POS.

## User flow

Sin cambios de alto nivel: escanear/buscar → carrito → medio de pago →
confirmar. El cambio es interno a qué pasa al presionar "Confirmar venta"
(o `F9`):

1. El cajero completa el carrito y el medio de pago como hoy — sin llamadas
   al backend hasta este punto.
2. Al confirmar, el frontend envía una única operación con los ítems y el
   pago. El backend crea la venta, sus ítems, registra el pago y confirma,
   todo en una transacción.
3. Si la operación tiene éxito, el flujo posterior no cambia: panel "Venta
   confirmada", rastro persistente de última venta
   (`improve-pos-checkout-flow`, Decisión 20), carrito vaciado.
4. Si la operación falla, no queda ningún registro parcial que limpiar; el
   cajero ve el mismo tratamiento de error ya normativo y puede reintentar
   sin riesgo de duplicar nada, porque no hay nada parcial que duplicar.

## UI states

- **Pending:** sin cambio de patrón — `pending`/`pendingImmediate` en el
  botón "Confirmar venta" sigue mostrando "Confirmando…", ahora durante una
  operación más corta (una llamada en vez de hasta 4 + N).
- **Error:** sin cambio de patrón — `CheckoutStatus` sigue mostrando
  `role="alert"` con "Volver" (`403`) o "Reintentar" (el resto), consumiendo
  el mismo `ApiError.kind` que ya expone `src/lib/api.ts`.
- **Success:** sin cambio — mismo panel "Venta confirmada" y mismo rastro
  persistente de última venta.

## Decisions

### 1. Una sola operación reemplaza la secuencia de 4 llamadas

`posSaleSubmission.ts` deja de orquestar `createSale`/`addSaleItem` (por
línea)/`setSalePayment`/`confirmSale` como pasos independientes y en su
lugar arma un único payload (ítems + pago) y hace una sola llamada a la
operación atómica que backend exponga. El mapeo línea → ítem
(`cartLineToSaleItemPayload`, ya existente) se conserva tal cual — sólo
cambia cómo se agrupan y envían los ítems, no su forma individual.

Alternativa descartada: mantener las 4 llamadas y sólo mejorar el manejo de
error/reintento del lado del cliente. Ya se intentó (`improve-pos-checkout-flow`,
Decisión 12) y no elimina la clase de problema — sólo evita duplicar el
draft en un reintento explícito, no evita que quede huérfano si no hay
reintento.

### 2. La guarda de "retener `sale.id` entre reintentos" se simplifica o se retira

Si la operación atómica no crea ningún registro hasta que la transacción
completa entera, un reintento tras un fallo no tiene ningún `sale.id`
previo que reutilizar — cada intento (inicial o reintento) es una llamada
nueva, autocontenida. La guarda actual (`existingSaleId`/`onSaleCreated`)
deja de aplicar de la misma forma; se simplifica a un reintento liso de la
misma operación. Esto se confirma contra el contrato final una vez que
backend lo despliegue: si en cambio el diseño de backend sí crea la venta
antes de confirmar (p. ej. un endpoint que combina `create+items+payment`
pero deja `confirm` como paso final separado), esta decisión se revisa.

### 3. El error de stock insuficiente sigue nombrando la línea afectada

`ui-pos` ya exige que un motivo de bloqueo por stock o peso inválido nombre
la línea afectada (`resolveCheckoutStatus`, `improve-pos-checkout-flow`). Si
la operación atómica descubre stock insuficiente dentro de la transacción
(en vez de en un paso de confirmación separado, como hoy), el error que
backend devuelva debe seguir permitiendo identificar qué línea/producto
causó el rechazo — se documenta como requisito del contrato en
`backend-request.md`, no se asume su forma.

## Accessibility

Sin cambios: el error de confirmación sigue usando `role="alert"`; ningún
estado nuevo depende sólo de color.

## Keyboard and focus behavior

Sin cambios: `F9` sigue confirmando; el foco tras éxito, error o reintento
sigue el mismo comportamiento ya normativo (`refocus()` en `PosView.tsx`).

## Responsive behavior

Sin cambios de breakpoints ni de layout.

## API contract

**Bloqueado por completo.** No existe hoy ningún endpoint que acepte ítems o
pago en la creación de una venta; se documenta como faltante en
`backend-request.md`, no se asume ni se mockea:

- Contrato atómico (forma exacta a definir por backend: un `POST /sales`
  ampliado que reciba `items[]` + `payments[]` y confirme en una
  transacción, o un endpoint nuevo aparte) — no existe.
- Se solicita que la respuesta de éxito mantenga la forma de `Sale` que ya
  devuelve `POST /sales/{id}/confirm` hoy (`id`, `sale_number`, `total`,
  `items`, `confirmed_at`, etc.) para no forzar un cambio de tipos más allá
  de lo estrictamente necesario — a confirmar contra lo que backend
  proponga.

Dinero sigue viajando como string decimal (`toCents`/`fromCents`); ningún
cálculo de negocio (total, stock disponible) se replica en el cliente.

## Error handling

Sin cambio de patrón: `401` sigue redirigiendo a `/login` vía `api()`;
`403` ofrece "Volver"; cualquier otro error (incluida una violación de
negocio como stock insuficiente, hoy un `409` en el paso de confirmación)
ofrece "Reintentar", consumiendo `{ message }` tal como llega. La única
diferencia observable es que ya no hay un estado intermedio "venta creada
pero sin ítems"/"ítems cargados pero sin pago" que el error deba describir
— el fallo es todo-o-nada.

## Backend coordination

Bloqueado en su totalidad. Ver `backend-request.md` para el contrato mínimo
solicitado, el criterio de desbloqueo y las dos preguntas que le
corresponde resolver a backend (forma exacta del contrato atómico; si el
flujo de 4 pasos actual se deprecia o convive con la operación atómica).

## Risks / Trade-offs

- [Contrato backend no verificado] → ninguna llamada ni mock se construye
  antes de verificar una instancia real; todas las tareas de implementación
  quedan bloqueadas en `tasks.md`.
- [Forma de la respuesta de error para stock insuficiente dentro de la
  transacción] → se documenta como requisito explícito en
  `backend-request.md` (debe poder identificar la línea/producto afectado);
  el frontend no inventa esa forma si backend no la confirma.
- [`posSaleSubmission.test.ts` actual queda desactualizado] → sus tests de
  guarda anti-duplicado (retener `sale.id` entre reintentos) dejan de tener
  sentido si el nuevo contrato no crea nada parcial; se reemplazan por tests
  de la operación única una vez que su forma esté confirmada.

## Migration Plan

1. Backend diseña y despliega el contrato atómico (endpoint nuevo o
   ampliado), documentando su forma exacta y su tratamiento de errores de
   negocio (stock insuficiente, línea afectada).
2. Se verifica el contrato contra una instancia real, con el mismo criterio
   de desbloqueo que `add-frontend-purchasing-optional-supplier/backend-request.md`.
3. Frontend implementa este change sólo después de esa verificación:
   `posSaleSubmission.ts` simplificado, `confirmSale()` actualizado,
   `posSaleSubmission.test.ts` reescrito para la operación única.
4. Se coordina con `pos-draft-recovery-and-stock-in-product` únicamente en
   el sentido de que ambos tocan `PosView.tsx`; no hay dependencia de orden
   entre ambos changes.

## Rollback

Si el frontend se revierte, el backend puede mantener el contrato atómico
desplegado sin romper el frontend previo, siempre que las 4 rutas actuales
(`POST /sales`, `POST /sales/{id}/items`, `PUT /sales/{id}/payment`,
`POST /sales/{id}/confirm`) sigan funcionando como hoy en paralelo al
contrato nuevo — a confirmar como parte del criterio de compatibilidad en
`backend-request.md`. No hay estado persistido nuevo del lado del frontend
que revertir.

## Open Questions

- Forma exacta del contrato atómico (un `POST /sales` ampliado vs. un
  endpoint nuevo): decisión de backend, no bloquea escribir este documento;
  bloquea implementarlo.
- Si el flujo de 4 pasos actual se deprecia por completo o convive con la
  operación atómica (por ejemplo, para permitir armar el carrito
  incrementalmente contra el backend antes de confirmar): a definir junto
  con backend; no bloquea el `backend-request.md`, que sólo pide que la
  confirmación final sea atómica.
