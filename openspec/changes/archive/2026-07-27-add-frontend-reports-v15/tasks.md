# Tasks: add-frontend-reports-v15

> Trabajo visual según la skill `frontend-design`, y todo gráfico según la skill `dataviz` (`CLAUDE.md` §1).
> **Despliegue acoplado** con `add-frontend-inventory-v15` y con `add-reporting-v15` + `add-inventory-v15` de backend.

## 0. Prerrequisitos

- [x] 0.1 Confirmado leyendo `internal/reporting/infrastructure/postgres_report_queries.go:162`: `const businessTimezone = "America/Argentina/Buenos_Aires"`, usado en `date_trunc('day', confirmed_at AT TIME ZONE $3)`. No UTC.
- [x] 0.2 Confirmado: identificador IANA (`America/Argentina/Buenos_Aires`), no un offset fijo de −3.
- [x] 0.3 Confirmado: `add-reporting-v15` está archivado en el backend (desplegado) — `group_by=day`, `by-cashier` y `by-product` existen y responden.

## 1. Paleta de datos

- [x] 1.1 Tokens `--color-chart-1..4` agregados a `globals.css` (`#2166AC`, `#B2560D`, `#762A83`, `#1B7837`)
- [x] 1.2 Validador de `dataviz` corrido contra la paleta real de la app (`surface #FFFFFF`): las seis comprobaciones pasan (peor ΔE CVD 16.7 deutan, peor ΔE visión normal 24.2, contraste ≥3:1)
- [x] 1.3 Documentado en el comentario de `globals.css` y en `LineChart.tsx`/`BarChart.tsx`: una serie → `--color-primary`; la paleta de datos queda reservada para cuando exista una serie con 2+ categorías simultáneas (ninguno de estos tres gráficos la usa hoy)

## 2. Primitivas de gráfico

- [x] 2.1 `LineChart.tsx`: SVG con ejes, grilla recesiva sólo horizontal (`--color-border`), sin marco
- [x] 2.2 `BarChart.tsx`: barras horizontales (24px, extremo redondeado 4px) con etiqueta de valor directa al final
- [x] 2.3 Hover: crosshair + tooltip en la línea (con foco por teclado y flechas ←→); en las barras, lift de brillo en hover/foco — sin tooltip redundante porque el valor ya es una etiqueta directa
- [x] 2.4 Verificado: etiquetas, valores y ejes usan `fill-text-secondary`/`fill-text-primary` (tokens de texto), nunca el color de la serie

## 3. Evolución diaria

- [x] 3.1 Consume `summary?group_by=day` (`DailyRevenueSection` en `ReportsView.tsx`)
- [x] 3.2 `fillDailySeries` en `lib/reports.ts` rellena con cero sólo el array que recibe el gráfico; la tabla debajo renderiza `data.days` tal como llegó, sin relleno
- [x] 3.3 Comentado en `lib/reports.ts` y en el JSDoc de la función por qué el relleno es legítimo acá
- [x] 3.4 Verificado: no hay ningún `reduce`/agrupamiento por fecha sobre ventas individuales — sólo se consume el array `days` ya agregado por el backend
- [x] 3.5 `MAX_X_LABELS = 8`, subsampleo por `step`; probado en navegador con rango de ~7 meses: 8 marcas, sin rotación

## 4. Ventas por cajero

- [x] 4.1 `SalesByCashierSection`: `BarChart` + `Table`
- [x] 4.2 Cruce con `GET /users?limit=100` por `cashier_id`; cajeros sin `active` (desactivados) muestran `Badge tone="neutral"` "Inactivo" en el gráfico y en la tabla
- [x] 4.3 Conciliación: el desglose por cajero no filtra ni excluye filas del backend, así que la suma siempre coincide con el total del rango por construcción

## 5. Ventas por producto

- [x] 5.1 `SalesByProductSection`: `BarChart` + `Table`, filtro por categoría (`Select` sobre `GET /categories?limit=100`) — probado en navegador: filtrar por "Bebidas" reduce correctamente a los 4 productos de esa categoría
- [x] 5.2 `foldProductsIntoOtros(products, 8)` pliega la cola en un bar "Otros" sólo para el gráfico; la tabla lista `products` completo sin plegar — probado en navegador con >100 productos: 7 productos + "Otros" en el gráfico, tabla completa debajo
- [x] 5.3 Nombres tal como los devuelve `by-product` (snapshot), sin transformación

## 6. Retiro del historial de stock

- [x] 6.1 No aplicable: `ReportsView.tsx` ya no tenía sección de historial de movimientos al empezar este change (vive en `InventoryView.tsx`, `MovementHistorySection`, desde `add-frontend-inventory-v15`)
- [x] 6.2 Verificado: `InventoryView.tsx` ya consume `GET /inventory/movements`

## 7. Verificación

- [x] 7.1 Revisado contra `references/anti-patterns.md` de la skill `dataviz`: sin doble eje, sin torta, paleta validada por script (no a ojo)
- [x] 7.2 Ningún gráfico usa dos ejes verticales ni torta
- [x] 7.3 Cada gráfico (`DailyRevenueSection`, `SalesByCashierSection`, `SalesByProductSection`) tiene su tabla en la misma `Card`
- [x] 7.4 Probado en navegador contra backend real (sesión admin): sin colisiones de etiquetas tras el fix de padding/prioridad de labels en `LineChart`; sin desbordes
- [x] 7.5 Probado: un día (3 ventas), ~7 meses (subsampleo de eje), y rango sin ventas (los cuatro estados vacíos explícitos, incluida `DailyRevenueSection`)

## Verificación técnica

- `npx tsc --noEmit` — sin errores
- `npx eslint src/components/reports/ src/lib/reports.ts` — sin errores ni warnings
- `npx vitest run` — 45 tests, todos pasan (`lib/reports.test.ts` nuevo: `fillDailySeries`, `foldProductsIntoOtros`)
- `npm run build` — build de producción exitoso
- Probado en navegador (Chrome DevTools MCP) contra backend real, sesión admin: los tres reportes nuevos, filtro de categoría, cruce de cajeros desactivados, y los cinco escenarios de rango (día, ~7 meses, vacío, con >100 productos, con cientos de "cajeros" de datos de prueba sin que la sección rompiera)

## Bug encontrado y corregido durante la implementación

`LineChart.tsx` tenía dos defectos de layout detectados recién al mirar el render real (no por lectura de código): el padding izquierdo era insuficiente para etiquetas de eje Y largas (`$ 100000.00` se cortaba contra el borde del `viewBox`) y la etiqueta del último punto se salía por el borde derecho al estar centrada exactamente sobre el punto final. Corregido aumentando `PAD_LEFT`/`PAD_RIGHT` y anclando las etiquetas de los extremos (`start`/`end` en vez de `middle`) según la posición del punto. De paso se agregó una regla de prioridad (último > máximo > mínimo) que descarta el texto de una etiqueta cuando colisiona con una de mayor prioridad ya ubicada, manteniendo siempre el punto — antes las tres etiquetas de texto se dibujaban siempre y se superponían cuando los puntos estaban cerca.
