## Why

Al cargar o editar un producto, la persona que administra el catálogo escribe
el costo y después tiene que calcular a mano el precio de venta y verificar
que el margen sea razonable. Ese cálculo manual es lento y propenso a error en
un kiosco con rotación alta de productos. Auto-calcular el precio de venta a
partir del costo y un porcentaje de ganancia editable, y mostrar el margen
resultante, ahorra ese paso sin cambiar ninguna regla de negocio del backend.

Además, en la carga inicial de stock del kiosco muchas veces se conoce el
precio de venta observado (envase, competencia) pero no el costo exacto —
justo el caso inverso al que ya cubre este formulario. Y el 30% de margen por
defecto resultó bajo para la operación real del kiosco: pasa a 35%, y
configurable por variable de entorno para no volver a hardcodearlo si cambia
de nuevo.

## What Changes

- En el formulario de alta/edición de producto (`ProductForm`), agregar un
  campo de "% de ganancia" editable, con valor por defecto 35, que sólo vive
  en el estado local del formulario (no se persiste ni se envía al backend).
  El default 35 es configurable por variable de entorno; si no está seteada o
  no es un número válido, se usa 35.
- Al escribir o cambiar el costo, si hay un porcentaje cargado, el precio de
  venta (`price` en `unitario`, `price_per_kg` en `pesable`) se recalcula
  automáticamente como `costo × (1 + %/100)`.
- Al editar el porcentaje, el precio de venta se recalcula con la misma
  fórmula.
- Al editar el precio de venta a mano:
  - **Si el costo ya tiene un valor no-cero, el costo no se toca.** Sólo se
    recalcula el porcentaje mostrado (`% = ((precio - costo) / costo) × 100`),
    igual que hoy.
  - **Si el costo está vacío o es `0`, se calcula hacia atrás** como
    `costo = precio / (1 + %/100)`, usando el porcentaje vigente (35% por
    defecto si el campo de porcentaje también está vacío o inválido). Este es
    el caso de alta rápida sin el costo a mano: se conoce el precio de venta
    observado y el sistema estima el costo, luego de una pausa de 500 ms y
    sólo cuando el precio contiene al menos tres dígitos.
- El porcentaje de ganancia nunca queda en un estado "vacío" a los fines del
  cálculo: si el campo está en blanco o tiene un valor inválido, cualquier
  cálculo (costo→precio o precio→costo) usa el default configurado (35% salvo
  override por variable de entorno) en su lugar.
- Mostrar, junto al precio, un texto derivado y no editable con el margen
  resultante (monto en pesos y porcentaje), por ejemplo
  `Margen: $ 375,00 (35%)`.
- Al abrir el formulario de edición de un producto existente, el porcentaje
  inicial se deriva del costo y precio ya guardados con la misma fórmula, en
  vez de resetear al default. Si el costo guardado es 0 o está vacío, se usa
  el default (35%, salvo override) como valor por defecto.
- El payload enviado a `POST /api/v1/products` y `PUT /api/v1/products/{id}`
  no cambia: sigue siendo `sku`, `barcode`, `name`, `category_id`,
  `unit_type`, `price`, `price_per_kg`, `cost`. No se agrega ningún campo
  nuevo al contrato.

Fuera de alcance:

- No se persiste el porcentaje en el backend ni se agrega un campo nuevo al
  modelo de producto.
- No se modifica `/reports/products` ni su cálculo de margen server-side.
- No se aplica este cálculo en otras pantallas (compras, POS, etc.).
- No se agrega una configuración de porcentaje por categoría, por usuario ni
  por tienda más allá de la única variable de entorno global.
- El costo calculado hacia atrás nunca pisa un costo ya cargado
  (no-cero); no hay una opción para forzar ese recálculo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-catalog`: los requirements "Create product" y "Edit product" agregan
  auto-cálculo cliente del precio de venta a partir de costo y un porcentaje
  de ganancia editable (35% por defecto, configurable por entorno), el
  cálculo inverso de costo a partir del precio de venta cuando el costo está
  vacío, y la visualización del margen resultante. El contrato con el backend
  (payload, endpoints, campos) no cambia.

## Impact

- `src/components/products/ProductForm.tsx`: agrega el campo de porcentaje,
  el texto de margen derivado y la lógica de recalculo entre costo, precio y
  porcentaje, incluyendo el cálculo inverso costo←precio cuando el costo está
  vacío o en `0`.
- `src/lib/products.ts` (o un módulo puro equivalente bajo `src/lib/`):
  funciones puras y testeadas para calcular precio desde costo+porcentaje,
  porcentaje desde costo+precio, y costo desde precio+porcentaje, usando
  aritmética en centavos como el resto del dinero del proyecto; y una
  constante de default de margen configurable por variable de entorno.
- No hay impacto en rutas, roles, navegación, backend ni dependencias nuevas.
