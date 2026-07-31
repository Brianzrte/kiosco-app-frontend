## Why

El reporte de productos puede mostrar márgenes calculados con el costo actual del catálogo cuando una venta o devolución histórica no tiene costo registrado. Sin una señal visible, una persona administradora puede interpretar ese valor estimado como un margen histórico exacto y estable.

## What Changes

- Consumir el campo booleano `margin_estimated` que ya devuelve `GET /api/v1/reports/products`.
- Distinguir visualmente las filas cuyo margen es estimado y ofrecer una explicación accesible del fallback al costo actual del catálogo.
- Mantener sin cambios el cálculo, la paginación, los filtros existentes y el reporte de ventas por producto.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-reports-detail`: el reporte de productos indicará cuándo el margen de una fila es estimado y explicará por qué.

## Impact

- `src/components/reports/ProductsReportView.tsx`: ampliar el tipo de respuesta y renderizar el indicador en la vista desktop y en la tarjeta mobile.
- Backend ya mergeado en `../backend` (`b301470` en `develop` y `origin/develop`): el endpoint existente agrega `margin_estimated: boolean`; no se requiere endpoint, proxy ni dependencia nueva.
- No se modifica `sales/by-product`, su filtro por categoría, ni ninguna otra pantalla de reportes.
