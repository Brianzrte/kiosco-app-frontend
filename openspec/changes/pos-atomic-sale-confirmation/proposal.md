## Why

Confirmar una venta en el POS es hoy una secuencia de hasta 4 llamadas HTTP
secuenciales al backend (`POST /sales` → N × `POST /sales/{id}/items` →
`PUT /sales/{id}/payment` → `POST /sales/{id}/confirm`); cada una es una
oportunidad de fallo parcial. Si la confirmación falla a mitad de camino, el
frontend ya evita duplicar el draft en un reintento (`improve-pos-checkout-flow`,
Decisión 12), pero si el cajero abandona la venta antes de reintentar (cierra
la pestaña, se va a otra pantalla), la venta queda en `draft` en el backend
sin que nadie la complete ni la descarte. Esta sesión reprodujo dos veces un
`500` real de `POST /sales/{id}/confirm` contra el backend local: la clase de
falla que motiva este change no es hipotética.

## What Changes

- **Confirmación de venta como una única operación atómica**: el frontend deja
  de orquestar 4 llamadas secuenciales y en su lugar envía ítems + pago en una
  sola operación que el backend confirma en una transacción — si algo falla,
  no queda ningún registro parcial que limpiar.
- **`src/lib/posSaleSubmission.ts` se simplifica**: la guarda anti-duplicado
  actual (retener `sale.id` entre reintentos) deja de tener sentido si ya no
  hay pasos intermedios que puedan fallar por separado; se reemplaza por el
  manejo de una única llamada con su propio reintento.
- **BREAKING (contrato backend)**: requiere un endpoint nuevo o un contrato
  ampliado que hoy no existe — ver `backend-request.md`. Este change no se
  implementa hasta que ese contrato se despliegue y se verifique contra una
  instancia real.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-pos`: modifica el requirement de confirmación de venta para que sea
  atómica (una operación, no una secuencia de llamadas independientes) y
  ajusta el comportamiento observable de reintento tras un fallo.

## Impact

- `src/components/pos/PosView.tsx`: `confirmSale()` deja de invocar
  `submitSale()` con la secuencia de 4 pasos; llama a la operación atómica
  nueva.
- `src/lib/posSaleSubmission.ts`: se simplifica o se reemplaza — la guarda
  `existingSaleId`/`onSaleCreated` (retención de `sale.id` entre reintentos)
  deja de aplicar de la misma forma; su test (`posSaleSubmission.test.ts`) se
  revisa junto con el cambio.
- `src/lib/types.ts`: posible ajuste de `Sale` si el contrato atómico
  devuelve un shape distinto al de `POST /sales/{id}/confirm` actual — a
  confirmar contra la respuesta de backend una vez desplegada.
- Requiere `backend-request.md`: no existe hoy ningún endpoint que acepte
  ítems o pago en la creación de la venta (`CreateSaleUseCase.Execute` sólo
  toma `cashierID`, sin ítems — verificado en
  `../backend/internal/sales/application/create_sale.go`). Bloqueado hasta
  que backend implemente y despliegue el contrato.
