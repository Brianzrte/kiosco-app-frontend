## Why

Hoy todo producto se vende por unidades enteras a un precio fijo, pero el
kiosco necesita vender a granel (fiambre, verdura) cobrando en base al peso
pesado en el mostrador. Además, el precio efectivamente cobrado no siempre
coincide con el que el sistema calcula para ese peso (el cliente pagó $140
cuando el cálculo dio $150 para 1,5 kg a $100/kg). El problema es de
contabilidad real: que la venta, el cierre de caja, los reportes y las
devoluciones reflejen lo que efectivamente entró a la caja, sin perder el
dato de cuál fue el cálculo teórico.

## What Changes

- Se agrega un tipo de producto (`unit_type`): `unitario` (comportamiento
  actual, sin cambios) o `pesable`. El alta/edición de producto exige elegir
  uno de los dos explícitamente, sin default vacío.
- Un producto `pesable` reemplaza el precio de venta unitaria por un campo
  nuevo `price_per_kg` (precio por kilogramo); el campo `price` no se
  reutiliza para este tipo.
- Los productos existentes migran implícitamente como `unitario`; su
  comportamiento no cambia.
- En el POS, agregar un producto `pesable` al carrito reemplaza el control de
  "cantidad" por un control de "peso" (kg, hasta 3 decimales). El sistema
  calcula el precio de la línea (`peso × price_per_kg`, redondeado a 2
  decimales) y lo muestra junto a un control para ingresar el precio real
  cobrado, cuando difiere del calculado.
- El precio real, cuando se ingresa, reemplaza al calculado como precio
  efectivo de esa línea para todo cálculo posterior de la venta en curso
  (total, balance de pago). Esta edición sólo está disponible antes de
  confirmar la venta; una vez confirmada, la línea es inmutable como
  cualquier otra hoy.
- Los productos `pesable` no llevan control de stock: el POS no consulta ni
  cap-ea su disponibilidad contra el inventario.
- En el historial de venta (`SaleDetail`), una línea con precio real distinto
  del calculado muestra el precio calculado tachado en rojo (con marcado
  semántico, no sólo color) junto al precio real cobrado, que es el que
  participa del total.
- Cierre de caja, reportes y devoluciones usan el precio real (cuando existe)
  como el `subtotal`/`unit_price` efectivo de la línea; esto lo calcula el
  backend en sus agregados, el frontend no recalcula nada.
- **BREAKING (backend)**: este change depende de un contrato nuevo en
  `Product` y en la línea de venta (`SaleItem`) que el backend no expone hoy;
  ver `backend-request.md`. No es implementable hasta que ese contrato exista
  y esté desplegado.

Fuera de alcance: edición del precio real después de confirmada la venta;
control de stock para pesables; cualquier unidad de peso distinta de
kilogramos; reportes nuevos o modificados específicos de pesables; devolver
una línea `pesable` desde `ReturnForm` (el selector de devolución actual
trabaja en unidades enteras, no en peso — ver `design.md`, Non-Goals).

## Capabilities

### New Capabilities

Ninguna. Este change extiende capabilities existentes; no introduce una
pantalla ni un dominio nuevo.

### Modified Capabilities

- `ui-catalog`: el alta/edición de producto exige elegir `unit_type` y, para
  `pesable`, un `price_per_kg` en vez de `price`.
- `ui-pos`: agregar un producto `pesable` al carrito usa peso en vez de
  cantidad entera; se agrega edición del precio real por línea antes de
  confirmar; el cálculo del total y del balance de pago usa el precio
  efectivo (real o calculado) de cada línea; los `pesable` no se cap-ean
  contra stock.
- `ui-sales`: el detalle de venta (`Sale detail view`) muestra, para una
  línea con precio real distinto del calculado, el calculado tachado junto
  al real.

## Impact

- `src/lib/types.ts`: extender `Product` con `unit_type`/`price_per_kg` y la
  línea de venta con los campos nuevos de peso/precio calculado/precio real
  (shape final pendiente del backend, ver `backend-request.md`).
- `src/lib/money.ts` o un módulo nuevo dedicado: función pura para
  `peso × price_per_kg` redondeado a centavo, decimal-seguro.
- `src/components/products/ProductForm.tsx`: selector de `unit_type` y campo
  condicional `price_per_kg`. Coordinar el orden de merge con el change
  abierto `add-frontend-automatic-product-sku`, que ya modifica este mismo
  archivo (bloque SKU) sin tocar `category_id`/`price`.
- `src/components/pos/PosView.tsx`: control de peso, editor de precio real
  por línea, cálculo de total con precio efectivo, sin validación de stock
  para pesables.
- `src/components/sales/SaleDetail.tsx`: precio calculado tachado + precio
  real cuando difieren.
- Backend: dependencia dura documentada en `backend-request.md` — sin ese
  contrato desplegado, este change no puede implementarse.
