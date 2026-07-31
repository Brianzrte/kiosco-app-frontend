## Why

El alta de productos obliga a inventar y escribir un SKU aunque la categoría ya esté seleccionada. Una propuesta del backend reduce errores y agiliza la carga sin quitarle a la persona usuaria el control del valor final.

## What Changes

- Consultar una propuesta de SKU al seleccionar una categoría.
- Mostrarla en el campo editable de SKU, sin sobrescribir valores editados manualmente.
- Conservar el formulario ante fallas de consulta y conflictos `409`, permitiendo completar o corregir el SKU manualmente.
- Mostrar el SKU efectivo devuelto por el backend después de crear el producto.
- Mantener la generación, unicidad y autoridad del SKU en el backend; el navegador no genera ni reserva valores.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `ui-catalog`: modifica el alta de productos para ofrecer una propuesta automática de SKU.

## Impact

- Frontend: formulario de creación de productos, integración mediante `api<T>()` y estados de carga/error/éxito.
- Backend: dependencia del endpoint `GET /api/v1/products/sku-suggestion?category_id={id}` y del contrato de creación automática definido en el change backend coordinado.
- UI: reutiliza el UI kit y las dependencias existentes; no requiere cambios de navegación ni nuevas dependencias.
- Fuera de alcance: generar SKUs en el cliente, reservarlos, cambiar SKUs existentes, incorporar la categoría al valor o modificar la gestión de categorías.
