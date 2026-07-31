# Tablas y visualización de datos

## Tabla o cards

| Usar **tabla** cuando | Usar **lista/cards** cuando |
|---|---|
| El usuario **compara** registros entre sí | El usuario **busca** un registro puntual |
| Los registros son homogéneos | Cada ítem tiene forma distinta |
| Hay 3+ atributos por registro | Hay 1–2 atributos |
| Importa ordenar o filtrar por columna | El ítem es una entidad navegable con identidad propia |
| Los valores son numéricos y alineables | El contenido es principalmente texto o imagen |

La ventaja de una tabla es la **alineación vertical**: comparar la cuarta
columna de veinte filas es trivial cuando están en columna, e imposible cuando
están en veinte cards separadas.

**No convertir cada fila en una card en escritorio.** Triplica el alto, destruye
la comparabilidad y agrega tres señales visuales —borde, sombra, fondo— donde
antes había una línea.

En **móvil** la respuesta depende de la tarea, no de la regla anterior: si el
usuario compara filas, la tabla sobrevive con scroll horizontal deliberado o con
columnas priorizadas; si busca un registro puntual y opera sobre él, la card o
la lista de pares label/valor es correcta —plana, sin acumular borde + sombra +
fondo— y en `md:` se vuelve a la tabla. Las seis estrategias, con cuándo aplica
cada una, están en `responsive-design.md`, *Tablas y datos densos*.

## Densidad

| Densidad | Alto de fila | Cuándo |
|---|---|---|
| Compacta | 32–36 px | Reportes, listados largos, comparación intensiva |
| Normal | 40–44 px | Default administrativo |
| Cómoda | 48–52 px | Filas con acciones frecuentes o uso táctil |

La densidad es coherente en toda la tabla. Una fila de 32 px con un botón de
44 px dentro se lee como error de implementación.

## Columnas

- **Prioridad de izquierda a derecha**: identificador → nombre → atributos →
  métricas → acciones.
- La columna clave (la que el usuario usa para encontrar la fila) es la primera
  y no se trunca.
- Techo práctico: 7–9 columnas visibles. Más que eso, la tabla se lee de a
  pedazos.
- Lo que no entra va a la fila expandible o al detalle, no a un scroll infinito
  a la derecha.
- El ancho de columna corresponde al contenido: una columna de "Estado" con
  200 px de ancho separa artificialmente lo que la rodea.

## Alineación

```text
Texto        → izquierda
Números      → derecha
Dinero       → derecha
Fechas       → izquierda (o derecha si son comparables en columna)
Estado/badge → izquierda
Acciones     → derecha
```

**El encabezado se alinea igual que su contenido.** Un `<th>` "Total" a la
izquierda sobre montos a la derecha rompe la lectura de la columna: el ojo pierde
el eje.

## Números y dinero

- `font-variant-numeric: tabular-nums` **siempre** en columna. En este repo:
  `.num` para dinero y conteos, `.data` para SKU, códigos y cantidades
  (`typography.md`).
- Mismo número de decimales en toda la columna: `1.200,50` y `980,00`, nunca
  `980`.
- Dinero **siempre** por `formatMoney` (`lib/money.ts`). Nunca un monto crudo
  interpolado.
- Los negativos con signo **y** contexto, no sólo en rojo (`color-system.md`).
- Los ceros: `0` es un valor, `—` es ausencia de dato. No son lo mismo y no se
  muestran igual.
- Números grandes con separador de miles; el formato argentino ya lo resuelve
  `formatMoney`.
- Una unidad se muestra una vez, preferentemente en el encabezado ("Precio ($)"),
  no repetida en cada celda.

## Fechas

- Formato consistente en toda la app: `Intl.DateTimeFormat("es-AR", …)`
  (`ai/context/frontend-conventions.md`).
- Los rangos de reporte son strings `"YYYY-MM-DD"` y se manipulan con los
  helpers de `lib/reports.ts`.
- Fecha relativa ("hace 2 h") sólo cuando la recencia es lo que importa, y
  **siempre** con la fecha exacta en el `title`.
- Una columna de fechas que se compara se alinea a la derecha y usa ancho fijo.

## Ordenamiento

- El estado de orden es **visible**: la columna activa marcada, con la dirección
  indicada por una flecha, y `aria-sort="ascending" | "descending" | "none"` en
  el `<th>`.
- Sólo se puede ordenar por columnas donde ordenar tiene sentido. Un
  encabezado clickeable que no ordena es una promesa rota.
- El encabezado ordenable es un `<button>` **dentro** del `<th>`, no un `<th>`
  con `onClick` — así es tabulable y activable con Enter/Space.
- El orden por defecto es el más útil (lo más reciente primero en un historial),
  no el orden de inserción de la base.
- Al reordenar, la posición del scroll vuelve arriba: el usuario está buscando
  otra cosa.

## Filtros

- Visibles, no escondidos tras un icono, cuando son parte del flujo normal.
- El estado del filtro es evidente: qué está aplicado y cómo se quita.
- Un contador de resultados junto a los filtros, anunciado con
  `aria-live="polite"`.
- Al cambiar un filtro, `page` vuelve a 1 (patrón ya establecido en este repo).
- Un filtro que deja 0 resultados muestra un **empty state distinto** del vacío
  real: "No hay productos con esos filtros" + acción "Limpiar filtros", no "No
  hay productos".
- Búsqueda con debounce de 250–350 ms (`performance-ux.md`).

## Paginación

- **Paginación de servidor** con `computeTotalPages` (`lib/pagination.ts`).
- Mostrar página actual, total y cantidad de registros: "Página 2 de 7 · 134
  productos". Un "Siguiente" sin contexto no deja estimar nada.
- Los controles quedan alcanzables sin scrollear toda la tabla en pantallas
  chicas.
- El scroll vuelve arriba al cambiar de página.
- Infinite scroll: **no** en tablas administrativas. Impide llegar al pie,
  rompe el "volver atrás" y hace imposible saber cuánto falta.

## Acciones en fila

- Como máximo 2 acciones visibles por fila. El resto, agrupado.
- La acción primaria de la fila suele ser navegar al detalle: la fila entera o
  su primera celda es un enlace, no un botón extra.
- **La acción destructiva se separa** de las frecuentes y lleva texto o
  confirmación (`iconography.md`).
- El área interactiva ≥ 32 px con separación en tabla densa, ≥ 44 px táctil.
- Si la fila entera es clickeable, las acciones internas deben detener la
  propagación — y la fila debe ser navegable con teclado.

## Selección

- Checkbox en la primera columna, con un "seleccionar todo" en el encabezado que
  distingue entre "todo lo visible" y "todo el resultado".
- El conteo de seleccionados es visible y se anuncia.
- Las acciones masivas aparecen en una barra que **no tapa** las filas
  seleccionadas.
- La selección sobrevive al scroll y se pierde de forma explícita al cambiar de
  página o de filtro — y se avisa cuando eso pasa.
- El estado `selected` es distinguible de `hover` y de `focus`
  (`color-system.md`).

## Sticky headers y columnas fijas

- Encabezado sticky cuando la tabla supera ~15 filas: sin él, al scrollear se
  pierde el significado de las columnas.
- Primera columna fija cuando hay scroll horizontal: es el ancla para saber qué
  fila se está leyendo.
- El sticky no puede tapar el elemento enfocado (WCAG 2.4.11): verificar
  tabulando con la página scrolleada.
- Necesita fondo opaco y un borde o sombra; si es translúcido, el contenido se
  lee por debajo.

## Estados de la tabla

Orden de render fijo en este proyecto: `error → loading → empty → datos`
(`ai/context/frontend-conventions.md`).

| Estado | Qué se muestra |
|---|---|
| Loading | `ListSkeleton({ rows })` con la geometría de las filas reales |
| Empty (sin datos) | `EmptyState` que **invita a la acción principal** |
| Empty (por filtros) | Mensaje distinto + "Limpiar filtros" |
| Error | `ErrorState` con el mensaje del backend y la acción según `error.kind` |
| Parcial | Los datos que llegaron + aviso de qué falta, no un error total |

El skeleton mantiene el alto de la tabla para que no salte el layout al llegar
los datos.

## Accesibilidad de tablas

- `<table>` real, con `<thead>`, `<tbody>`, y `<th scope="col">` en cada
  encabezado. Un `<div role="table">` es un downgrade sin motivo.
- `<caption>` o un `aria-labelledby` que nombre la tabla.
- `aria-sort` en la columna ordenada.
- El contenedor con scroll es tabulable (`tabindex="0"`) y tiene nombre
  accesible, para que se pueda scrollear con teclado.
- Ninguna celda comunica su significado sólo por color.
- Las tablas de layout no existen; todo layout es CSS.

## Comparación de valores

Un número solo no dice nada. Para que un valor sea interpretable hace falta al
menos una de estas referencias:

- **Comparación temporal**: vs. el periodo anterior, con la variación explícita.
- **Comparación con un objetivo**: vs. meta, vs. mínimo de stock.
- **Comparación entre pares**: el ranking, la posición en la lista.
- **Contexto de escala**: el total del que forma parte, el porcentaje.

"Ventas: $ 45.200" no permite decidir nada. "Ventas: $ 45.200 · +12 % vs. la
semana pasada" sí. La variación lleva signo **y** dirección textual, no sólo
color y flecha.

## Gráficos

- **Sólo si responde una pregunta que la tabla no responde de un vistazo.** Un
  gráfico de 4 barras al lado de la misma tabla de 4 filas es decoración.
- Elección: tendencia en el tiempo → línea. Comparación entre categorías →
  barras. Composición → barras apiladas, casi nunca torta. Correlación →
  dispersión.
- **Torta: evitar.** Más de 3 porciones y comparar ángulos se vuelve poco
  fiable. Una barra horizontal ordenada hace el mismo trabajo mejor.
- Eje Y arrancando en **0** en un gráfico de barras. Truncarlo exagera
  diferencias.
- Etiqueta directa sobre la serie mejor que una leyenda que obliga a ir y venir.
- Paleta: una serie → `primary`; 2+ categorías → `chart-1..4` en **orden fijo,
  sin ciclar**, validados para contraste y CVD. **Los pasteles nunca codifican
  un dato** (`ui-system.md`).
- Un gráfico necesita su propio empty state y su propio estado de error.
- Accesibilidad: el gráfico tiene una alternativa textual — la tabla que lo
  alimenta, un resumen, o `aria-label` con la conclusión.

## Checklist de tablas para una revisión

- [ ] Tabla `<table>` real con `<th scope="col">`.
- [ ] Texto a la izquierda, números y dinero a la derecha.
- [ ] Los encabezados se alinean igual que su contenido.
- [ ] Todos los montos con `.num` y `formatMoney`.
- [ ] Mismo número de decimales en toda la columna.
- [ ] Los encabezados se distinguen por peso y color, no por tamaño mayor.
- [ ] El orden activo es visible y lleva `aria-sort`.
- [ ] El encabezado ordenable es un `<button>` tabulable.
- [ ] `hover`, `focus` y `selected` son distinguibles entre sí.
- [ ] Máximo 2 acciones visibles por fila; la destructiva está separada.
- [ ] Loading, empty, empty-por-filtro y error, los cuatro presentes.
- [ ] El skeleton mantiene el alto para no saltar el layout.
- [ ] El empty state invita a la acción principal.
- [ ] La paginación dice página, total y cantidad de registros.
- [ ] El scroll horizontal está en el contenedor, no en la página.
- [ ] Ninguna fila se convirtió en card.
- [ ] Cada métrica tiene una referencia de comparación.
- [ ] Cada gráfico responde algo que la tabla no responde de un vistazo.
- [ ] Ningún gráfico usa la paleta pastel para codificar datos.
