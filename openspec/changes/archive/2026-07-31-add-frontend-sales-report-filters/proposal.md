## Why

Los presets de período del reporte de ventas están separados del botón de filtros, lo que dispersa los controles de rango y ocupa espacio permanente en la cabecera. El reporte debe abrir mostrando el mes calendario actual y permitir elegir todos los períodos desde un único lugar.

## What Changes

- Mover Hoy, Ayer, Semana, Mes y Últimos 6 meses dentro del panel de `Mostrar filtros` del reporte de ventas.
- Mostrar Mes como período seleccionado por defecto, con el rango del primer día del mes actual hasta hoy.
- Mantener editables las fechas Desde/Hasta; al modificarlas, el preset deja de aparecer seleccionado.
- Reemplazar la paginación en memoria de los días por paginación provista por backend, coordinando el contrato en `backend-request.md`.
- Mostrar el carrusel de resumen de ventas antes del panel de filtros y del listado diario.
- Conservar el endpoint, los estados de carga/vacío/error, la tabla y la paginación actuales.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-reports-detail`: cambia la ubicación y el estado inicial observable de los filtros del reporte de ventas.

## Impact

- `src/components/reports/SalesReportView.tsx`: reorganizar los controles de período, agregar el estado del preset seleccionado e integrar paginación backend cuando el contrato esté disponible.
- `GET /api/v1/reports/sales/daily-breakdown` requiere una extensión aditiva de contrato documentada en `backend-request.md`.
