## Why

Al cargar o editar un producto, la persona que administra el catálogo escribe
el costo y después tiene que calcular a mano el precio de venta y verificar
que el margen sea razonable. Ese cálculo manual es lento y propenso a error en
un kiosco con rotación alta de productos. Auto-calcular el precio de venta a
partir del costo y un porcentaje de ganancia editable (30% por defecto), y
mostrar el margen resultante, ahorra ese paso sin cambiar ninguna regla de
negocio del backend.

## What Changes

- En el formulario de alta/edición de producto (`ProductForm`), agregar un
  campo de "% de ganancia" editable, con valor por defecto 30, que sólo vive
  en el estado local del formulario (no se persiste ni se envía al backend).
- Al escribir o cambiar el costo, si hay un porcentaje cargado, el precio de
  venta (`price` en `unitario`, `price_per_kg` en `pesable`) se recalcula
  automáticamente como `costo × (1 + %/100)`.
- Al editar el porcentaje, el precio de venta se recalcula con la misma
  fórmula.
- Al editar el precio de venta a mano, el porcentaje mostrado se recalcula
  para reflejarlo (`% = ((precio - costo) / costo) × 100`), de forma que
  costo, precio y porcentaje queden siempre consistentes entre sí sin importar
  cuál se editó último.
- Mostrar, junto al precio, un texto derivado y no editable con el margen
  resultante (monto en pesos y porcentaje), por ejemplo
  `Margen: $ 375,00 (30%)`.
- Al abrir el formulario de edición de un producto existente, el porcentaje
  inicial se deriva del costo y precio ya guardados con la misma fórmula, en
  vez de resetear a 30%. Si el costo guardado es 0 o está vacío, se usa 30%
  como valor por defecto.
- El payload enviado a `POST /api/v1/products` y `PUT /api/v1/products/{id}`
  no cambia: sigue siendo `sku`, `barcode`, `name`, `category_id`,
  `unit_type`, `price`, `price_per_kg`, `cost`. No se agrega ningún campo
  nuevo al contrato.

Fuera de alcance:

- No se persiste el porcentaje en el backend ni se agrega un campo nuevo al
  modelo de producto.
- No se modifica `/reports/products` ni su cálculo de margen server-side.
- No se aplica este cálculo en otras pantallas (compras, POS, etc.).
- No se agrega una configuración global de porcentaje por defecto de la
  tienda; el 30% queda fijo en el frontend.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-catalog`: los requirements "Create product" y "Edit product" agregan
  auto-cálculo cliente del precio de venta a partir de costo y un porcentaje
  de ganancia editable, y la visualización del margen resultante. El contrato
  con el backend (payload, endpoints, campos) no cambia.

## Impact

- `src/components/products/ProductForm.tsx`: agrega el campo de porcentaje,
  el texto de margen derivado y la lógica de recalculo entre costo, precio y
  porcentaje.
- `src/lib/products.ts` (o un módulo puro equivalente bajo `src/lib/`): nueva
  función pura y testeada para calcular precio desde costo+porcentaje y
  porcentaje desde costo+precio, usando aritmética en centavos como el resto
  del dinero del proyecto.
- No hay impacto en rutas, roles, navegación, backend ni dependencias nuevas.
