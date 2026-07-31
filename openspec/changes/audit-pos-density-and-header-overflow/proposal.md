## Why

La auditoría visual con Chrome DevTools en 1366×768 confirmó que la entrada del POS consume demasiado alto y que las filas del carrito pierden densidad, especialmente cuando el viewport es bajo o apaisado. También se detectó scroll horizontal en el header a 1280–1366px por el control de cierre de sesión fuera del ancho visible.

## What Changes

- Compactar visualmente el campo de escaneo sin bajar el target táctil ni afectar el foco scan-first.
- Componer escaneo y búsqueda en una fila desde el breakpoint donde entren sin comprimirlos; mantenerlos apilados en anchos menores.
- Estabilizar las filas del carrito con una composición de columnas que evite `flex-wrap` accidental y reduzca el espacio estructural, manteniendo controles frecuentes de al menos 44×44px.
- Mantener sin cambios la jerarquía y el tamaño del panel de total, métodos de pago y confirmación.
- Corregir el overflow horizontal del header en anchos de tablet y notebook, preservando todas las secciones autorizadas, el rol y el cierre de sesión.
- Verificar la solución en los viewports prioritarios del POS y en la matriz responsive mínima.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-pos`: cambia la densidad y composición responsive de la zona de entrada y las filas del carrito, sin cambiar el flujo de venta, pagos, endpoints ni reglas de negocio.
- `ui-foundation`: refuerza el contrato de ausencia de overflow horizontal del header en los anchos reales de notebook y tablet.

## Impact

- Componentes afectados: `src/components/pos/PosView.tsx` y `src/components/shell/Nav.tsx`.
- No se modifican rutas, permisos, navegación semántica, endpoints, contratos backend ni datos persistidos.
- No se agregan dependencias.
- El total, métodos de pago, foco del escáner, feedback de carrito y barra móvil de confirmación deben conservar su comportamiento actual.
