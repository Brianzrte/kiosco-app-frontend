## Context

`SalesReportView` ya mantiene `from` y `to`, inicia con el primer día del mes actual y hoy, y vuelve a consultar `GET /reports/sales/daily-breakdown` cuando cambia el rango. Los botones Hoy/Ayer y los presets de rango están fuera de `CollapsibleFilters`, mientras que las fechas están dentro del panel.

## Goals / Non-Goals

**Goals:**

- Reunir todos los controles de período dentro de `CollapsibleFilters`.
- Hacer evidente que Mes es el preset inicial y que el rango inicial es el mes calendario actual.
- Permitir que el usuario elija presets con teclado y que edite fechas manualmente.
- Mantener funcionalidad desde 320 px sin overflow.
- Paginar los días desde backend, sin traer todos los días del rango ni recalcular el agregado en el cliente.
- Ordenar la vista de éxito como resumen/carrusel, filtros y listado diario.

**Non-Goals:**

- Cambiar la semántica existente de `presetRange` (Semana, Mes y Últimos 6 meses siguen usando sus rangos actuales).
- Cambiar la agregación backend, el contenido de la tabla o los estados de datos.
- Agregar persistencia del filtro, URL state, nuevos presets o cambios al dashboard.

## Decisions

1. **Un solo panel `CollapsibleFilters` para presets y fechas.** Los presets se renderizan antes de Desde/Hasta dentro del mismo contenido; en móvil se apilan y pueden envolver, y en desktop quedan en una fila flexible. Esto satisface la intención de un único botón sin crear otro patrón de filtros.

2. **Estado local `activePreset`.** Se inicializa en `month`; al elegir cualquier preset actualiza el rango y la selección visual; al editar Desde o Hasta se vuelve `null`. Así nunca se presenta “Mes” como seleccionado cuando el usuario creó un rango personalizado.

3. **Mes por defecto = mes calendario actual.** Se conserva `firstOfMonth()` + `today()` ya usado por la pantalla. No se llama automáticamente a `presetRange("month")`, porque ese helper representa una ventana móvil de 30 días y no el mes calendario solicitado.

4. **Preset seleccionado con variante primaria.** Se reutilizan los botones del UI kit y la diferencia se comunica por texto y estado visual del botón; foco visible y activación por Enter/Space ya son provistos por `Button`. No se agrega color aislado ni dependencia nueva.

5. **Separar resumen de filas paginadas.** El resumen de tarjetas se obtendrá desde el endpoint existente `GET /reports/sales/summary?from=&to=&group_by=payment_method`, que ya devuelve los totales del rango y el desglose por medio de pago. El endpoint paginado `daily-breakdown` quedará reservado para las filas diarias y sus metadatos de paginación; el cliente no sumará las páginas para construir totales.

6. **Paginación backend con `page` y `limit`.** Se solicitará `daily-breakdown?from=&to=&page=&limit=` con un tamaño fijo de 20 días, siguiendo el patrón de Productos e Historial, y una respuesta `{ days, page, limit, total }`, manteniendo la forma de cada día. El frontend usará `computeTotalPages` para presentar los controles, pero no para traer ni agrupar datos adicionales.

7. **Resumen antes de filtros.** `SummaryCards` se renderiza primero y el panel `CollapsibleFilters` inmediatamente después, antes de las cards mobile o la tabla desktop. En loading, vacío y error los filtros siguen accesibles debajo del estado correspondiente.

## Risks / Trade-offs

- [Panel más alto en móvil] Agrupar cinco presets y dos fechas aumenta el contenido desplegado. → Se mantiene una grilla flexible y controles existentes; el panel sólo ocupa espacio cuando el usuario lo abre.
- [Rangos manuales] Un rango editado puede coincidir exactamente con un preset pero no tener selección. → Se prioriza no afirmar que el usuario eligió un preset; la selección se conserva sólo por acción explícita.
- [Backend aún sin paginación] La pantalla actual no puede consumir el contrato futuro sin una respuesta compatible. → La implementación de paginación queda bloqueada en las tareas hasta verificar el endpoint real; no se agrega un fallback silencioso ni se mockea.

## Migration Plan

No hay migración de datos ni de contrato. El cambio se publica como frontend; revertirlo restaura la ubicación anterior de los controles sin afectar reportes ni datos.

La paginación sí requiere rollout coordinado: primero backend debe aceptar los parámetros y devolver metadatos; luego frontend puede cambiar de respuesta completa a respuesta paginada. El contrato es aditivo para permitir rollback del frontend mientras el backend mantiene compatibilidad con requests sin paginación.

## Open Questions

La decisión de nombres `page`, `limit`, `total` y la forma exacta de `summary` queda sujeta a confirmación del backend; el requerimiento mínimo está documentado en `backend-request.md`.
