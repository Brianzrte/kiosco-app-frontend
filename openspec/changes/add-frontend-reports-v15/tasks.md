# Tasks: add-frontend-reports-v15

> Trabajo visual según la skill `frontend-design`, y todo gráfico según la skill `dataviz` (`CLAUDE.md` §1).
> **Despliegue acoplado** con `add-frontend-inventory-v15` y con `add-reporting-v15` + `add-inventory-v15` de backend.

## 0. Prerrequisitos

- [ ] 0.1 Confirmar que el backend agrupa por día en `America/Argentina/Buenos_Aires` (decidido) y **no** en UTC. Verificar con una venta confirmada después de las 21:00 hora local: debe imputarse al día local, no al siguiente
- [ ] 0.2 Verificar que el backend usa el identificador IANA y no un offset fijo de −3
- [ ] 0.3 Verificar que `by-cashier`, `by-product` y `group_by=day` estén desplegados

## 1. Paleta de datos

- [ ] 1.1 Agregar los tokens `--chart-1..4` (`#2166AC`, `#B2560D`, `#762A83`, `#1B7837`) al tema
- [ ] 1.2 Volver a correr el validador de `dataviz` sobre la paleta y guardar el resultado; repetir si algún token cambia
- [ ] 1.3 Documentar la regla: una serie → Primary de marca; dos o más → paleta de datos en orden fijo, nunca ciclada

## 2. Primitivas de gráfico

- [ ] 2.1 Componente de línea en SVG con ejes, escalas y grilla recesiva (sólo horizontal, sin marco)
- [ ] 2.2 Componente de barras horizontales con etiqueta directa de valor al final de cada barra
- [ ] 2.3 Capa de hover: cursor con tooltip en la línea, tooltip por marca en las barras, con área de contacto mayor que la marca
- [ ] 2.4 Verificar que sólo se usen tokens de texto para etiquetas y valores, nunca el color de la serie

## 3. Evolución diaria

- [ ] 3.1 Consumir `summary?group_by=day`
- [ ] 3.2 Rellenar con cero los días ausentes **sólo para el gráfico**; dejar la tabla con las filas devueltas
- [ ] 3.3 Comentar en el código por qué el relleno es legítimo acá (ausencia = cero ventas), para que no se copie a un reporte donde signifique "no medido"
- [ ] 3.4 Verificar que no exista ningún reagrupamiento por fecha en el cliente
- [ ] 3.5 Submuestrear las marcas del eje en rangos largos; no rotar etiquetas

## 4. Ventas por cajero

- [ ] 4.1 Barras horizontales + tabla
- [ ] 4.2 Incluir cajeros desactivados con insignia de inactivo
- [ ] 4.3 Verificar la conciliación: la suma por cajero debe dar el total del rango

## 5. Ventas por producto

- [ ] 5.1 Barras horizontales + tabla, con filtro por categoría
- [ ] 5.2 Plegar la cola larga en "Otros" **sólo en el gráfico**; la tabla conserva todas las filas
- [ ] 5.3 Usar los nombres tal como los devuelve el backend (vienen del snapshot de la venta)

## 6. Retiro del historial de stock

- [ ] 6.1 Quitar la sección de historial de movimientos de `ReportsView.tsx`
- [ ] 6.2 Coordinar con `add-frontend-inventory-v15`, que la reimplanta en Inventory

## 7. Verificación

- [ ] 7.1 Revisar cada gráfico contra el catálogo de anti-patrones de `dataviz`
- [ ] 7.2 Verificar que ningún gráfico use doble eje ni torta con más de tres categorías
- [ ] 7.3 Verificar que cada gráfico tenga su tabla en la misma pantalla
- [ ] 7.4 Abrir y mirar el resultado renderizado: colisiones de etiquetas, geometría, desbordes
- [ ] 7.5 Probar con rango de un día, de un año, y con rango sin ventas
