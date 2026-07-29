# Ejemplo — Auditoría de un dashboard

> **Ejemplo didáctico, no una auditoría del código actual.** Describe una versión
> hipotética del dashboard de reportes con defectos deliberados, para mostrar el
> formato y el nivel de detalle esperado. Los `archivo:línea` son ilustrativos.
> No debe citarse como evidencia sobre `src/components/reports/ReportsView.tsx`.

---

# UX/UI Review

## Context
- Screen: `/reports` — `src/components/reports/ReportsView.tsx`
- Product type: dashboard / reporte
- Primary user: administrador (rol `admin`), consulta diaria de 2–3 minutos
- Main task: entender cómo viene el negocio hoy y decidir si hay que actuar
- Main input method: mouse + teclado, escritorio
- Evidence reviewed: `ReportsView.tsx`, `ReportNavCard.tsx`, `BarChart.tsx`;
  revisión visual en 1440 × 900, 1280 × 720 y 360 × 800; contraste medido en 6
  pares. **No revisado:** lector de pantalla, 1024 × 768, medición de
  performance con throttling.

## Result
- Score: **56/95** — *Performance y motion* no evaluada
- Status: **FAIL**
- Confidence: media (código + revisión visual; sin datos de producción reales)

| Categoría | Peso | Puntaje | Por qué |
|---|---:|---:|---|
| Eficiencia de la tarea | 25 | 8 | Ninguna métrica es interpretable: no hay periodo ni comparación |
| Accesibilidad | 20 | 12 | Los gráficos no tienen alternativa textual y una serie usa pasteles |
| Jerarquía y claridad | 15 | 3 | 11 cards idénticas: no hay nada que domine |
| Consistencia | 15 | 12 | Usa los primitives; el formato de fechas varía entre bloques |
| Feedback y prevención de errores | 10 | 8 | Loading y error resueltos; falta el empty de cada gráfico |
| Responsive | 5 | 1 | La tabla se convierte en cards y deja de poder compararse |
| Performance y motion | 5 | — | **Not evaluated** |
| Pulido visual | 5 | 4 | Tokens y espaciado correctos |

## Executive summary

El dashboard muestra los datos correctos pero **no permite sacar ninguna
conclusión**: 11 cards del mismo peso, sin periodo visible y sin comparación
contra nada. "Ventas: $ 45.200" no dice si el día viene bien o mal, que es la
única pregunta que el administrador viene a responder.

La corrección de mayor impacto no es visual: es agregar **contexto temporal** y
**comparación** (DASH-01 y DASH-02). Con eso, la jerarquía se puede construir
encima; sin eso, cualquier rediseño sigue sin responder la pregunta.

## Blockers

`Ninguno` — la pantalla no impide completar ninguna tarea ni pone en riesgo un
dato. Los problemas son de interpretabilidad, no de bloqueo.

## Findings

| ID | Severity | Area | Location | Problem | Impact | Recommendation | Validation |
|---|---|---|---|---|---|---|---|
| DASH-01 | HIGH | claridad | header | No se ve a qué periodo corresponden los números | Los datos no son interpretables ni comparables | Selector de periodo visible con el rango activo | El rango se lee sin hacer clic |
| DASH-02 | HIGH | claridad | las 11 cards | Ninguna métrica tiene referencia de comparación | "$ 45.200" no permite decidir nada | Variación vs. periodo anterior, con signo y texto | Cada métrica muestra su variación y contra qué |
| DASH-03 | HIGH | jerarquía | grilla de cards | 11 cards del mismo tamaño y peso | Hay que leer las 11 en cada visita | 3 métricas guía grandes; el resto en una fila compacta | Entrecerrando los ojos se distinguen 3 bloques dominantes |
| DASH-04 | HIGH | responsive | tabla de productos | En < 768 px cada fila pasa a card | Comparar 10 productos deja de ser posible | Scroll horizontal con la primera columna fija | En 360 px la tabla scrollea dentro de su contenedor |
| DASH-05 | MEDIUM | color | `BarChart.tsx:34` | Las series usan la paleta pastel | Bajo contraste y sin separación para CVD | `chart-1..4` en orden fijo | Verificado en escala de grises: las series se distinguen |
| DASH-06 | MEDIUM | claridad | gráfico de medios de pago | Torta de 2 valores junto al mismo dato en texto | Ocupa un cuarto de la pantalla sin agregar nada | Eliminarla; el dato en texto ya responde | El gráfico eliminado no deja ninguna pregunta sin responder |
| DASH-07 | MEDIUM | accesibilidad | ambos gráficos | Sin alternativa textual | Un usuario con lector no accede al dato | `aria-label` con la conclusión, o la tabla que lo alimenta | El lector anuncia el contenido del gráfico |
| DASH-08 | MEDIUM | consistencia | `ReportsView.tsx:88` y `:145` | Dos formatos de fecha distintos en la misma pantalla | Duda sobre si son el mismo periodo | Un solo formato vía `Intl.DateTimeFormat("es-AR")` | Todas las fechas de la pantalla usan el mismo formato |
| DASH-09 | MEDIUM | estados | ambos gráficos | Sin empty state propio | Un periodo sin ventas muestra un gráfico vacío sin explicar | Empty state por gráfico | Con un rango sin datos se lee por qué está vacío |
| DASH-10 | LOW | claridad | cards de métrica | Los montos no usan `.num` | Los valores no alinean entre cards | Aplicar `.num` | Los montos alinean verticalmente entre cards |
| DASH-11 | SUGGESTION | eficiencia | header | El periodo no se recuerda entre visitas | Hay que reelegirlo cada vez | Persistir la última selección | Al volver, el rango es el último usado |

### DASH-01 — Falta contexto temporal

- **Severidad:** HIGH
- **Área:** claridad
- **Ubicación:** header de `ReportsView.tsx`
- **Problema:** ninguna parte de la pantalla dice a qué periodo corresponden los
  números. El rango se aplica en el fetch pero no se muestra.
- **Evidencia:** el header sólo contiene el título "Reportes". Ningún bloque
  menciona fechas.
- **Impacto:** un número sin periodo no es interpretable. El administrador no
  puede saber si "$ 45.200" es de hoy, de la semana o del mes, y por lo tanto no
  puede decidir nada.
- **Principio:** una métrica necesita una referencia para ser interpretable
  (`../references/tables-data-visualization.md`, *Comparación de valores*).
- **Recomendación:** selector de periodo en el header, con el rango activo
  visible en texto ("1 – 29 de julio de 2026") y presets (hoy, 7 días, 30 días,
  mes). Los rangos son strings `"YYYY-MM-DD"` manipulados con los helpers de
  `lib/reports.ts`.
- **Criterio de validación:** el rango activo se lee en el header sin hacer
  clic, y cambiarlo actualiza todos los bloques de la pantalla.

### DASH-03 — Demasiadas cards, sin jerarquía

- **Severidad:** HIGH
- **Área:** jerarquía
- **Ubicación:** grilla principal
- **Problema:** 11 cards del mismo tamaño, con el mismo borde, la misma sombra y
  el mismo peso tipográfico.
- **Evidencia:** screenshot en 1440 × 900. Entrecerrando los ojos se ve una
  grilla uniforme: ningún bloque domina.
- **Impacto:** el usuario tiene que leer las 11 cards en cada visita para
  encontrar la que importa. En una consulta diaria de 2 minutos, eso es la mayor
  parte del tiempo.
- **Principio:** jerarquía por tamaño y posición; evitar el layout que es sólo
  cards (`../references/spacing-layout.md`).
- **Recomendación:** identificar las **3 métricas guía** (las que responden "¿el
  día viene bien?") y darles el doble de tamaño y `title-md`. Las 8 restantes
  pasan a una fila compacta de valores con label, **sin card** — el espacio y el
  encabezado ya las agrupan. Es una redistribución de la misma información, no
  un rediseño del sistema.
- **Criterio de validación:** entrecerrando los ojos se distinguen 3 bloques
  dominantes. La pantalla sigue mostrando las 11 métricas.

### DASH-04 — Responsive deficiente en la tabla

- **Severidad:** HIGH
- **Área:** responsive
- **Ubicación:** tabla de productos más vendidos
- **Problema:** por debajo de 768 px cada fila se convierte en una card con
  borde y sombra.
- **Evidencia:** en 360 × 800, 10 productos ocupan ~1400 px de alto y las
  cantidades dejan de estar en columna.
- **Impacto:** la tabla existe para **comparar**. Al apilar las filas en cards,
  comparar cantidades deja de ser posible: hay que memorizar cada valor mientras
  se scrollea.
- **Principio:** no convertir cada fila en card; el scroll horizontal va en el
  contenedor (`../references/responsive-design.md`).
- **Recomendación:** conservar la `<table>` y dejar que el contenedor scrollee
  horizontalmente, con la columna de producto fija. `Table` de este repo ya
  provee el contenedor con scroll.
- **Criterio de validación:** en 360 × 800 la tabla mantiene su estructura, la
  columna de producto queda visible al scrollear, y la página no scrollea
  horizontalmente.

### DASH-06 — Gráfico que no aporta

- **Severidad:** MEDIUM
- **Área:** claridad
- **Ubicación:** bloque de medios de pago
- **Problema:** una torta con dos porciones (efectivo / tarjeta), al lado de un
  bloque de texto que muestra los mismos dos porcentajes.
- **Evidencia:** ambos bloques presentan exactamente los mismos dos números.
- **Impacto:** ocupa aproximadamente un cuarto del ancho útil sin responder
  ninguna pregunta que el texto no responda. Ese espacio le falta a las métricas
  guía.
- **Principio:** un gráfico se justifica sólo si responde algo que la tabla o el
  texto no responden de un vistazo. Con 2 porciones, la torta nunca gana
  (`../references/tables-data-visualization.md`).
- **Recomendación:** eliminar la torta. Si en el futuro los medios de pago pasan
  a ser 4 o más, una barra horizontal ordenada — no una torta.
- **Criterio de validación:** eliminado el gráfico, no queda ninguna pregunta
  sin responder en la pantalla.

## Visual hierarchy

Es el eje más débil (DASH-03). La pantalla presenta 11 unidades de información
del mismo peso y ninguna referencia de importancia. `ReportNavCard` sí está bien
usada: cada una es un destino navegable, que es exactamente cuando una card se
justifica.

## Interaction and feedback

La navegación a los reportes de detalle es clara y consistente. Falta
interacción sobre los datos mismos: no se puede cambiar el periodo (DASH-01) ni
comparar contra otro (DASH-02).

## Accessibility

Verificado manualmente: contraste medido en 6 pares (todos ≥ 4.5:1 salvo las
series pasteles del gráfico, DASH-05); escala de grises (las series del gráfico
dejan de distinguirse); recorrido con teclado en 1440 × 900 (OK).

Falla adicional: los gráficos no tienen alternativa textual (DASH-07).

**Not evaluated:** lector de pantalla, zoom 200 %.

## Responsive behavior

Verificado en 1440 × 900 (OK), 1280 × 720 (OK) y 360 × 800 (DASH-04).
**Not evaluated:** 1024 × 768, 768 × 1024, 1920 × 1080.

## Keyboard navigation

El recorrido es correcto: las `ReportNavCard` son enlaces reales, tabulables y
activables con Enter, y el foco es visible. No hay controles interactivos sobre
los datos que revisar (todavía).

## States

Loading (`ListSkeleton`) y error (`ErrorState`) están resueltos a nivel de
pantalla, con el orden de render correcto. Falta el empty state por bloque:
un periodo sin ventas hoy muestra un gráfico vacío sin explicación (DASH-09).

## Performance and motion

**Not evaluated.** No se midió con throttling ni se revisó Network. Se observa
que no hay animaciones en la pantalla, lo que es correcto para un reporte, pero
no alcanza para puntuar la categoría.

## Positive findings

- **`ReportNavCard` usa la card correctamente**: cada una es una entidad
  navegable independiente, que es justamente cuando una card se justifica. El
  problema de DASH-03 son las cards de **métrica**, no estas.
- **Los agregados los calcula el backend.** No hay sumas ni reagrupaciones en el
  cliente que reconstruyan totales autoritativos — que es el error habitual en
  pantallas de reporte y acá está bien resuelto.
- **El display shaping vive en `lib/reports.ts` y está testeado.** Los cálculos
  de rango de fechas usan `Date.UTC` como calculadora de calendario, con el
  motivo documentado.
- **Loading y error a nivel de pantalla están resueltos** con los componentes
  del kit y en el orden de render correcto.
- Sin animaciones. En un reporte eso es un acierto, no una omisión.

## Acceptance criteria

- [ ] El rango de fechas activo se lee en el header sin hacer clic.
- [ ] Cambiar el rango actualiza todos los bloques de la pantalla.
- [ ] Cada métrica muestra su variación y contra qué periodo se compara.
- [ ] La variación lleva signo y texto, no sólo color y flecha.
- [ ] Entrecerrando los ojos se distinguen 3 bloques dominantes.
- [ ] Las 11 métricas siguen presentes tras la redistribución.
- [ ] En 360 × 800 la tabla mantiene su estructura y scrollea dentro de su
      contenedor.
- [ ] La página no scrollea horizontalmente en ningún viewport.
- [ ] Las series del gráfico usan `chart-1..4` en orden fijo.
- [ ] En escala de grises las series se siguen distinguiendo.
- [ ] Cada gráfico tiene alternativa textual.
- [ ] Todas las fechas de la pantalla usan el mismo formato.
- [ ] Cada gráfico tiene su empty state, con el motivo del vacío.
- [ ] Los montos de las cards usan `.num` y alinean entre sí.

## Deferred suggestions

- **DASH-11 (recordar el periodo entre visitas).** Mejora real, pero requiere
  decidir dónde se persiste y qué pasa si el rango guardado ya no aplica.
  Corresponde a un change propio.
- Comparación contra el mismo periodo del año anterior. Depende de que el
  backend exponga ese agregado; hoy no existe.
- Alertas configurables (stock bajo, caída de ventas). Es una feature de
  producto, no un arreglo de esta pantalla.
