# Design: add-frontend-reports-v15

## Context

Después de `add-reporting-v15`, Reporting queda restringido a agregaciones de ventas:

| Ruta | Devuelve |
|---|---|
| `/reports/sales/summary?group_by=day\|total` | filas por día o total del rango |
| `/reports/sales/by-cashier` | por cajero: nombre, cantidad, ingresos |
| `/reports/sales/by-product` | por producto: nombre snapshot, categoría, cantidad, ingresos |
| `/reports/sales`, `/reports/sales/{id}`, `/reports/products/top` | ya implementados |
| ~~`/reports/stock/history`~~ | **eliminado**, se muda a `/inventory/movements` |

Todos exigen rango de fechas y son Admin. Dos propiedades del backend que condicionan el diseño:

- **Los días sin ventas se omiten**, no vienen en cero. El backend lo decidió explícitamente y dijo que el cliente puede rellenar los huecos con el rango que él mismo pidió.
- **Los cajeros desactivados siguen apareciendo.** Sus ventas ocurrieron; filtrarlas haría que la suma por cajero no cierre contra el total.

## Goals / Non-Goals

**Goals:**
- Que el operador vea la tendencia sin reconstruirla mentalmente.
- Que cada gráfico sea legible para daltonismo y sin depender del color como única señal.
- Que gráfico y tabla convivan: uno para la forma, la otra para el número exacto.

**Non-Goals:**
- Biblioteca de charting. Son tres formas simples sobre pocos datos; un SVG propio con los tokens del sistema pesa menos y no arrastra una API ajena al design system.
- Exportación a CSV/Excel, fuera de alcance del MVP y no habilitada por el backend.
- Dashboard configurable, widgets reordenables, rangos comparativos ("vs. período anterior"): el backend no los soporta y nadie los pidió.
- Reagrupar o recalcular en el cliente. El backend agrega; el frontend dibuja.
- Reportes de devoluciones o por método de pago: dependen de changes que aún no existen.

## Decisions

**La paleta de marca no puede ser la paleta de series. Está medido.**
Se corrió el validador de `dataviz` sobre los tonos de marca:

```
#9C566C, #C08497, #DFB2C4  (mauve de marca)
  [FAIL] Normal-vision floor   ΔE 13.2  (piso: 15)
  [FAIL] Chroma floor          los tres leen como gris
```

Son el mismo matiz a distinta claridad: indistinguibles como categorías incluso con visión normal. Y el primer reemplazo intuitivo tampoco sirve — mauve contra teal da **ΔE 2.3 bajo deuteranopía**, prácticamente el mismo color.

La paleta de series adoptada, validada en las seis comprobaciones:

```
--chart-1: #2166AC   /* azul   */
--chart-2: #B2560D   /* ocre   */
--chart-3: #762A83   /* violeta*/
--chart-4: #1B7837   /* verde  */

  [PASS] banda de claridad · piso de croma · separación CVD (peor ΔE 16.7 deutan)
  [PASS] piso de visión normal (peor ΔE 24.2) · contraste ≥ 3:1
```

Se asignan **en orden fijo**, nunca cicladas. Una novena serie no genera un color: se pliega en "Otros".

**Casi todos estos gráficos son de una sola serie, y ahí manda la marca.**
Evolución diaria, por cajero y por producto son una sola magnitud. Con una serie no hace falta paleta categórica: se usa el `--primary` mauve de marca, que sí pasa contraste como color de marca única. La paleta de series entra sólo cuando hay dos o más categorías simultáneas — hoy únicamente el desglose por método de pago, cuando `add-frontend-sales-payments` exista.

El resultado es que la identidad de marca se conserva en el 90% de los gráficos, y sólo cede donde comprometería la legibilidad.

**Formas, elegidas por el trabajo del dato:**

| Reporte | Forma | Por qué |
|---|---|---|
| Resumen del rango | tarjetas de estadística | Dos números. Un gráfico de dos valores es decoración |
| Ingresos por día | línea | Cambio en el tiempo; la línea es la forma que lo dice |
| Ventas por cajero | barras **horizontales** | Pocas categorías con nombres de largo variable; horizontal deja leer el nombre sin rotarlo |
| Ventas por producto | barras horizontales, top N | Igual, y los nombres de producto son largos |

Nada de torta: comparar ángulos es peor que comparar longitudes, y con más de tres categorías es ilegible.

**Los huecos se rellenan con cero, y es correcto hacerlo.**
El backend omite los días sin ventas. En una línea, saltearlos es un error: conectar el lunes con el miércoles dibuja una pendiente que no ocurrió y esconde que el martes no se vendió nada.

Rellenar es legítimo acá porque **la ausencia significa cero, no dato faltante**: el rango lo eligió el usuario y las ventas confirmadas son el universo completo. No se está inventando información, se está representando una ausencia que tiene significado.

El relleno es del gráfico. **La tabla muestra lo que el backend devolvió**, sin filas fabricadas.

**Gráfico y tabla juntos, no uno u otro.**
El gráfico responde "cómo viene"; la tabla responde "cuánto exactamente" y es además la vista accesible del mismo dato — requisito de la skill `dataviz` y del piso de accesibilidad de `CLAUDE.md` §6. Nunca se reemplaza la tabla por el gráfico.

**No hay eje doble. Nunca.**
Cantidad de ventas e ingresos son magnitudes de escala distinta. Superponerlas en dos ejes verticales produce cruces que sugieren relaciones inexistentes y cuya forma depende de cómo se escalaron los ejes. Si hacen falta las dos, son dos gráficos apilados con el mismo eje horizontal.

**El texto usa tokens de texto, nunca el color de la serie.**
Valores, etiquetas y ejes van en `--text-primary` / `--text-secondary`. Una marca de color al lado carga la identidad. Números coloreados sobre fondo claro fallan contraste y se leen como estado (error, éxito) que no significan.

**Grilla y ejes recesivos.** Grilla en `--border`, sólo horizontal, sin bordes de marco. Lo que tiene que resaltar es el dato.

**Etiquetas directas selectivas.** En las barras, el valor va al final de cada una — no hay eje que leer. En la línea, sólo se etiquetan el máximo, el mínimo y el último punto; un número sobre cada punto convierte el gráfico en una tabla mal formateada.

**Hover con tooltip, por defecto.** Cursor con tooltip en la línea, tooltip por marca en las barras, con área de contacto mayor que la marca. Es lo que evita tener que etiquetar todo.

**Los cajeros desactivados aparecen, marcados.**
Coherente con el backend: sus ventas son hechos. Se muestran con una insignia de inactivo para que no se lea como que siguen operando. Excluirlos rompería la conciliación contra el total, que es el error más difícil de detectar en un reporte.

**El frontend no reagrupa por día.**
El agrupamiento es del backend, incluida su zona horaria. Si el frontend reagrupara a partir de las ventas crudas, habría dos definiciones de "día" y divergirían. El gráfico muestra los `rows` tal como llegan.

**Zona horaria del agrupamiento diario: `America/Argentina/Buenos_Aires` (UTC−3). Decidido.**
El kiosco opera en Buenos Aires y "las ventas del martes" significa el día local. La agrupación es `date_trunc('day', confirmed_at AT TIME ZONE 'America/Argentina/Buenos_Aires')` **del lado del backend**.

Se usa el identificador de zona IANA, no un desplazamiento fijo de −3: un offset codificado a mano deja de ser correcto si Argentina vuelve a aplicar horario de verano, y el error resultante sería un corrimiento de una hora en el límite del día que nadie detectaría hasta conciliar contra caja.

El frontend **no** reagrupa ni convierte: recibe filas ya agrupadas por día local y las dibuja. Las fechas que muestra son las etiquetas que el backend devuelve, sin reinterpretación de zona en el cliente — que es justamente donde se introduciría una segunda definición de "día".

## Risks / Trade-offs

- **La zona horaria quedó decidida, pero el backend tiene que implementarla** → Si el backend agrupa en UTC, el gráfico muestra las ventas de la noche en el día siguiente y no hay señal visible del error. El frontend no puede detectarlo ni compensarlo. **Verificar contra datos reales con una venta después de las 21:00 hora local antes de dar el gráfico por bueno.**
- **Rellenar con cero es correcto acá, pero es un patrón peligroso de generalizar** → Vale porque ausencia = cero ventas. En un reporte donde la ausencia signifique "no medido", rellenar sería fabricar datos. La distinción debe quedar en el código, no sólo en este documento.
- **SVG propio en vez de biblioteca** → Menos peso y control total del design system, a cambio de implementar ejes, escalas y tooltips a mano. Con tres formas simples es una buena relación; si aparecen zoom, brush o series densas, hay que reevaluar.
- **Rangos largos vuelven ilegibles las etiquetas del eje** → Un rango de un año son 365 puntos: la línea sigue funcionando, las etiquetas no. Mostrar un subconjunto de marcas, nunca rotar el texto a 45°.
- **El despliegue está acoplado a `add-frontend-inventory-v15`** → El historial de movimientos se retira de acá y aparece allá. Separados, desaparece de ambos lados o queda duplicado.

## Migration Plan

1. Confirmar que el backend agrupa en `America/Argentina/Buenos_Aires` y no en UTC.
2. Desplegar backend (`add-reporting-v15` + `add-inventory-v15`) y frontend (este change + `add-frontend-inventory-v15`) en el mismo release.
3. Validar la paleta de datos con el script antes de dar el change por terminado, y de nuevo si algún token cambia.

Rollback: revertir el frontend restaura las tablas del MVP, salvo el historial de stock, cuyo endpoint ya no existe.

## Open Questions

- ¿`Sales by Cashier` debería mostrar ticket promedio? El backend lo identificó como "probablemente lo primero que van a pedir" y no lo agregó. Si se agrega allá, acá es una columna más.
- Cuando existan devoluciones, ¿los ingresos se muestran netos o brutos? Afecta a los tres reportes y hay que resolverlo antes de que las devoluciones existan, no después.
- ¿Cuántos productos muestra el gráfico de ventas por producto antes de plegar en "Otros"? Sugerido: 8, el límite de la paleta y de lo legible en barras.
