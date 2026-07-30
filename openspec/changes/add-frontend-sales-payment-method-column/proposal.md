## Why

En Historial de ventas, ni el Admin ni el Cajero pueden ver con qué medio se
pagó una venta sin abrir su detalle, aunque ese dato ya viaja en la misma
respuesta que alimenta la lista. Además, la lista pide un tamaño de página
fijo de 20 filas que hoy desborda la ventana y fuerza scroll de página, un
problema que Inventario ya resolvió con un mecanismo de ajuste dinámico.

## What Changes

- La lista de ventas (`SalesTable`, desktop y mobile) agrega una columna/celda
  de "medio de pago" que muestra el método (o los dos métodos, si el pago fue
  dividido) con el mismo lenguaje visual sólido que ya usa la columna Estado
  (fondo de color pleno + texto del método adentro), reutilizando los tokens
  de color de método de pago ya existentes (`--color-payment-cash/-card/
  -transfer`).
- Una venta sin ningún pago registrado (borrador) muestra un guion, igual que
  ya hace la columna Número cuando no hay dato.
- El tamaño de página de la lista de ventas deja de ser fijo (`PAGE_SIZE = 20`)
  y pasa a ajustarse dinámicamente a la altura disponible de la ventana
  (clamp 5–15 filas), igual que ya hace Inventario, re-midiendo en `resize` y
  volviendo a página 1 cuando el tamaño cambia. Este ajuste aplica tanto a la
  tabla de escritorio como a las cards de mobile, porque `SalesTable` monta
  ambos árboles DOM simultáneamente con alturas de fila distintas.
- Se acota la excepción de "sin color" del requirement "Payment breakdown
  display" para que ya no cubra la columna de método de pago de la lista de
  ventas: esa columna pasa a usar color, con texto siempre presente como
  segundo canal. El detalle de venta y la línea de una devolución no cambian:
  siguen en texto plano, sin color.

**No BREAKING**: no hay cambio de contrato ni de rol; sólo se agrega una
columna de sólo lectura y se cambia el tamaño de página pedido al mismo
endpoint ya consumido.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-sales`: se modifica el requirement "Payment breakdown display" para
  acotar su excepción de texto-plano-sin-color, excluyendo la columna de
  método de pago de la lista de ventas (que pasa a usar pills de color con
  texto). El detalle de venta y la línea de una devolución conservan la regla
  vigente sin cambios.

## Impact

- `src/components/sales/SalesView.tsx`: `SalesTable` gana la celda de método
  de pago (desktop y mobile) y reemplaza `PAGE_SIZE` fijo por un tamaño de
  página dinámico.
- `src/components/ui/Badge.tsx`: nueva(s) `Tone`(s) para los tres colores de
  método de pago (ver `design.md` para nombre y ubicación exacta).
- `src/lib/`: nueva lógica pura testeable para el tamaño de página dinámico de
  Sales (generalizada desde `computeInventoryPageSize` o equivalente propio —
  ver `design.md`).
- No se toca `SaleDetail.tsx`, `ReturnHistory.tsx` ni `ReturnForm.tsx`.
- No hay dependencia de backend: `GET /sales` ya devuelve `payments` en cada
  `OperationalSale` (`src/lib/types.ts`); no se agrega ningún campo, endpoint
  ni `backend-request.md`.
