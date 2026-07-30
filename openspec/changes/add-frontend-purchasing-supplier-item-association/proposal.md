## Why

En `/purchasing/new`, cuando no hay proveedor seleccionado, la sección de sugerencias de reposición muestra en una sola lista tanto productos realmente bajos de stock como productos con datos de planificación incompletos, bajo el mismo texto "Revisar datos"; la persona usuaria no puede distinguir de un vistazo qué necesita reponerse de qué necesita completar información. Además, cuando sí hay proveedor seleccionado, elegir en un ítem un producto que todavía no está asociado a ese proveedor no ofrece ninguna salida: la persona debe abandonar la creación del pedido, ir a la ficha del producto, asociar el proveedor y volver a empezar el pedido desde cero.

## What Changes

- Cuando no hay proveedor seleccionado en `/purchasing/new`, dividir la sección de sugerencias de reposición en dos bloques: "Bajos de stock" (`suggested_quantity` positivo, con su acción "Usar N" como hoy) y "Datos de planificación incompletos" (`suggested_quantity` nulo, mostrando la explicación del backend). Cada bloque tiene su propio texto de vacío cuando no tiene ítems.
- Cuando hay proveedor seleccionado y la persona usuaria elige, en un ítem del pedido, un producto sin ninguna asociación activa (preferida o no) con ese proveedor, mostrar un warning inline con la acción de asociar el producto al proveedor sin salir del formulario ni perder los ítems ya cargados. La asociación reutiliza el mismo patrón de lectura y reemplazo completo (`GET`/`PUT /products/{id}/suppliers`, alta con `preferred: false`) ya usado en la ficha de producto.
- Fuera de alcance de este change: crear un pedido sin proveedor y acotar la lista de sugerencias al proveedor seleccionado considerando cualquier asociación no preferida; ambos puntos requieren ampliar `GET /purchase-orders/suggestions` y quedan en un change hermano bloqueado por backend.

## Capabilities

### Modified Capabilities

- `ui-suppliers-purchasing`: la creación manual de pedidos separa las sugerencias sin proveedor en dos secciones explicables y permite asociar inline un producto al proveedor seleccionado del pedido.

## Impact

- `src/components/purchasing/PurchaseOrderForm.tsx`: divide la sección de sugerencias en dos bloques y agrega el warning y la acción de asociación por ítem.
- `src/lib/purchasing.ts` (o módulo equivalente): funciones puras para partir las sugerencias por `suggested_quantity` y para decidir/​construir la asociación producto-proveedor, testeables sin React.
- No agrega rutas, roles ni endpoints nuevos. Reutiliza exclusivamente `GET /purchase-orders/suggestions`, `GET /products/{id}/suppliers` y `PUT /products/{id}/suppliers`, ya verificados y desplegados.
- Depende de `add-frontend-suppliers-purchasing` (todavía sin archivar), del cual hereda `PurchaseOrderForm.tsx` y la capability `ui-suppliers-purchasing`.
- No agrega dependencias.
