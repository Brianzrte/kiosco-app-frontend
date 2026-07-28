## Context

`/reports` acumuló seis secciones en una sola página al ritmo de los changes que las agregaron (`add-frontend-mvp`, `add-frontend-reports-v15`). Ninguna tiene jerarquía sobre las otras: el operador scrollea buscando. Este change las reorganiza en un dashboard más cuatro reportes de detalle.

Investigación de backend, leyendo código y no sólo specs:

| Lo pedido | Qué hay hoy |
|---|---|
| Resumen del rango, evolución diaria | `GET /reports/sales/summary` con `group_by=total\|day\|payment_method` — ✅ existe |
| Top N productos | `GET /reports/products/top?limit=N` — ✅ existe |
| % contra período anterior | No hay endpoint de comparación, pero **no hace falta**: son dos llamadas al mismo `summary` |
| Ventas por día con medio de pago **y cajero** | ❌ `group_by=day` devuelve `{date, total_sales, total_amount}` y nada más. `group_by=payment_method` agrega sobre todo el rango, no por día. `GET /reports/sales` lista ventas individuales con `cashier` y `payments[]`, sin agrupar |
| Productos con stock, costo, precio, margen | ❌ `by-product` da cantidad e ingresos, sólo de productos **con** ventas. `GET /inventory/stock` (`stockListItemResponse`) no devuelve `price` ni `cost`. El costo vive en `GET /products` |
| Valorización de inventario | ❌ No existe |
| Proveedores / compras | ❌ Cero: ni dominio, ni tabla, ni migración, ni ruta, ni spec. `CLAUDE.md` lo lista explícitamente fuera del MVP |
| Transferencia como medio de pago | ❌ `internal/sales/domain/sale.go` define sólo `PaymentCash = "CASH"` y `PaymentCard = "CARD"` |

## Goals / Non-Goals

**Goals:**
- Que `/reports` se lea de un vistazo y responda "cómo viene el negocio" sin scrollear.
- Que cada reporte de detalle tenga su pantalla, sus filtros y su propia URL.
- Que lo que se puede construir hoy se construya hoy, y lo bloqueado quede documentado y visiblemente bloqueado, sin mocks silenciosos.

**Non-Goals:**
- Construir el módulo de proveedores en el frontend antes de que exista en el backend.
- Recalcular en el cliente cualquier agregación que el backend deba dar (ver decisión abajo).
- Dashboard configurable, widgets reordenables, exportación: nada de eso está pedido ni soportado.
- Cambiar el flujo de cobro del POS para soportar `TRANSFER`: eso pertenece a `add-frontend-sales-payments`, este change sólo consume el resultado en el reporte.

## Decisions

**La comparación contra el período anterior son dos llamadas al mismo endpoint, y eso no viola la regla de "no agregues en el cliente".**
La regla que este repo viene sosteniendo (`add-frontend-cash-closing/design.md`, y el defecto que corrigió `add-frontend-inventory-v15`) prohíbe **derivar un agregado a partir de filas crudas paginadas**. Comparar dos totales que el backend ya calculó es otra cosa: se pide `summary?from=A&to=B` y `summary?from=A'&to=B'` donde el segundo rango tiene la misma longitud y termina justo antes del primero, y se computa `(actual − anterior) / anterior`. Ninguno de los dos números se derivó en el navegador; la resta de dos cifras autoritativas no introduce una segunda definición de nada.

La alternativa —pedir un endpoint de comparación al backend— se descarta por innecesaria: agrega superficie de API para una resta.

Casos borde que la UI debe manejar explícitamente, porque son los que hacen mentir a un porcentaje: período anterior en cero (no se muestra "+∞%", se muestra "sin ventas en el período anterior"), y ambos en cero (no se muestra comparación).

**El gráfico se reduce a la mitad parametrizando la altura, no clonando el componente.**
`LineChart.tsx` tiene hoy `HEIGHT = 220` como constante de módulo. Pasa a ser una prop con ese valor por defecto. Un segundo componente "compacto" duplicaría la lógica de escalas, ejes y tooltip para cambiar un número.

**Las cards-botón son navegación, no un tipo de gráfico.**
Son `<Link>` estilados como `Card`, con foco visible y área de click completa. La de proveedores se renderiza deshabilitada, con la razón visible ("Requiere el módulo de proveedores"), en vez de omitirse: mostrar el hueco comunica que está previsto y evita que se vuelva a pedir como si fuera nuevo. Un `<Link>` deshabilitado no existe en HTML, así que esa card es un `<div>` con `aria-disabled` y sin `href`, nunca un link que navega a una página rota.

**Los tres reportes bloqueados se especifican completos y no se implementan.**
Mismo patrón que ya usó este repo con `add-frontend-cash-closing` mientras estuvo bloqueado, y con `add-frontend-users` §6/§7. La especificación completa es lo que hace que el `backend-request.md` sea preciso; construir la UI contra un contrato que el backend todavía puede rechazar garantiza reescribirla.

El reporte de ventas por día es el más tentador de improvisar, porque `GET /reports/sales` trae `cashier` y `payments[]` en cada fila: bastaría agrupar por día en el navegador. Es exactamente el error prohibido — el listado es paginado (20 por página), así que la agrupación sería silenciosamente parcial, y "día" quedaría definido por el timezone del navegador en vez del `America/Argentina/Buenos_Aires` que el backend ya resuelve (`postgres_report_queries.go:162`).

**El margen lo calcula el backend, no el frontend.**
Margen = ingresos − (costo unitario × cantidad vendida). Cruzarlo en el cliente exige tres endpoints (`by-product`, `/products`, `/inventory/stock`), aritmética de dinero sobre el resultado, y encima `by-product` omite los productos sin ventas, que son justamente los que el filtro "menos vendidos" necesita. Se pide un endpoint que devuelva la fila completa.

**La valorización de inventario es un agregado, no una tabla que el cliente suma.**
Multiplicar costo × cantidad para cada producto y sumar es una agregación de dinero sobre un listado paginado: el caso de libro de lo que el backend debe calcular. Se pide `GET /inventory/valuation` devolviendo los dos totales ya calculados.

**`TRANSFER` se pide como tercer método del dominio, no como una etiqueta del reporte.**
La tentación es mostrar "tarjeta/transferencia" como una sola columna y seguir. Pero el kiosco quiere saber cuánto entró por transferencia, y esa información no existe si el cajero nunca pudo registrarla: no es un problema de presentación sino de dominio. El reporte se diseña con las tres columnas y muestra transferencia en cero hasta que el backend y el POS la soporten.

## Risks / Trade-offs

- **Se quitan dos secciones que se implementaron y archivaron hace horas** (`add-frontend-reports-v15`, por cajero y por producto) → Aceptado y explícito: el usuario las evaluó en uso y no aportan en el dashboard. `BarChart.tsx` se conserva porque el reporte de productos lo reusa; el código de las secciones se borra en vez de comentarse. La spec `ui-reports` registra el retiro, así que no vuelve a aparecer como "faltante".
- **Tres de las cuatro cards del dashboard llevan a pantallas que no se pueden construir todavía** → El dashboard queda con más promesa que producto hasta que el backend acompañe. Mitigación: las cards bloqueadas se muestran deshabilitadas con la razón, no como links rotos, y el change no se da por terminado hasta que al menos el reporte de ventas exista.
- **El % contra período anterior puede leerse como una afirmación más fuerte de lo que es** → Un rango de 3 días comparado contra los 3 anteriores es ruido, no tendencia. Mitigación: la comparación siempre nombra el período contra el que compara ("que los 7 días anteriores"), nunca dice "que la semana pasada" si el rango no es una semana.
- **Pedir `TRANSFER` toca el POS, que es el camino crítico** → El reporte no puede desplegarse asumiendo que existe. Mitigación: la columna se renderiza desde el desglose que devuelva el backend; si `TRANSFER` no está entre los métodos, la columna muestra cero sin romperse.
- **Cuatro pantallas nuevas multiplican la superficie de role-gating** → Todas heredan el guard de `/reports` (Admin). Cada `page.tsx` nueva llama al mismo `requireRole(["admin"])`; no se delega el chequeo al layout ni al menú.

## Migration Plan

1. **Fase 1 (se puede hoy):** dashboard — resumen, evolución compacta, comparación contra período anterior, top 3, y las cuatro cards-botón (tres deshabilitadas). Retiro de por-cajero y por-producto.
2. **Fase 2 (bloqueada):** `/reports/sales`, `/reports/products` y la valorización, cuando existan los endpoints de `backend-request.md`.
3. **Fase 3 (bloqueada, sin fecha):** `/reports/purchases`, cuando exista el módulo de proveedores.

Rollback: revertir el frontend restaura la página larga anterior. Ningún dato se migra ni se pierde — todos los reportes son de sólo lectura.

## Open Questions

- ¿El filtro "semanal / mensual / últimos 6 meses" del reporte de ventas reemplaza al selector de fechas libre, o convive con él? Se propone que sean presets que setean el rango, con el rango libre todavía editable — es lo que la skill `dataviz` recomienda para filtros de tiempo y evita perder el caso "un día puntual".
- ¿La valorización de inventario debe considerar sólo productos activos, o también los desactivados con stock remanente? Afecta el número que el operador va a tomar como "capital inmovilizado". Se propone incluir ambos, discriminados, y se traslada la pregunta al backend en el pedido.
- ¿"Menos vendidos" incluye productos con cero ventas en el rango? Se asume que sí — es justamente el caso que el operador busca — y por eso el endpoint pedido debe partir del catálogo, no de las ventas.
- Cuando existan devoluciones en los reportes, ¿el margen y los ingresos se muestran netos o brutos? Ya estaba abierta en `add-frontend-reports-v15`; este change la hereda sin resolverla.
