# Espaciado y layout

## Escala

Escala completa, base 4 con saltos crecientes:

```text
0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80
```

Escala operativa recomendada — la que se usa el 95 % del tiempo:

```text
4, 8, 12, 16, 24, 32, 48, 64
```

Mapeo a Tailwind: `1`=4 · `2`=8 · `3`=12 · `4`=16 · `6`=24 · `8`=32 · `12`=48 ·
`16`=64.

Los valores 2, 6, 20, 40 y 80 existen para casos puntuales (separar un icono de
su texto, un ajuste óptico). Usarlos como default indica que se está espaciando
"a ojo" en vez de por sistema.

**Este proyecto ya tiene la escala de Tailwind aplicada. No se define una escala
nueva ni se aplican estos valores automáticamente sobre algo que ya es
coherente** (constitución §22). La escala sirve para detectar el valor arbitrario
(`p-[13px]`, `mt-[22px]`), que es el hallazgo real.

## Proximidad y agrupación

La regla que más rinde de todo este documento:

> **El espacio entre grupos debe ser claramente mayor que el espacio dentro de
> un grupo. Relación mínima usable: 2:1.**

```text
gap-2  (8px)   dentro de un par label + valor
gap-4  (16px)  entre campos de un mismo grupo
gap-8  (32px)  entre grupos de un formulario
gap-12 (48px)  entre secciones de una pantalla
```

Cuando todo está a `gap-4`, el usuario no ve estructura: ve una lista plana y
tiene que leer cada elemento para descubrir la relación. Es el defecto de layout
más común y también el más barato de arreglar.

Prueba: entrecerrando los ojos hasta perder el texto, ¿se ven bloques
diferenciados? Si se ve una masa uniforme, falta contraste de espaciado.

## Ritmo vertical

Los bloques que se repiten mantienen el mismo espaciado. Un formulario donde los
campos están a 16, 16, 24, 16, 20 px se lee "desprolijo" sin que se pueda señalar
por qué: es el ritmo roto.

- Un solo valor de separación entre elementos del mismo tipo.
- Un solo valor entre secciones.
- El cambio de valor **significa** un cambio de nivel jerárquico. Si no
  significa nada, es un error.

## Padding interno

| Contenedor | Padding |
|---|---|
| Card | 24 (`p-6`) — es el valor de `Card` en este repo |
| Card compacta / celda de dashboard | 16 (`p-4`) |
| Celda de tabla | 12 × 16 vertical × horizontal |
| Celda de tabla densa | 8 × 12 |
| Botón normal | 8–10 vertical, 16 horizontal |
| Botón grande (POS) | 12–14 vertical, 20–24 horizontal |
| Input | 8–10 vertical, 12 horizontal |
| Dialog | 24, con 16 entre el título y el cuerpo |

El padding de un contenedor debe ser **mayor o igual** que el gap entre sus
hijos. Si los hijos están a `gap-6` dentro de un `p-4`, el contenido "toca" el
borde y el grupo se lee mal.

## Separación de secciones

- Entre secciones de una pantalla: 32–48.
- Entre el header de la pantalla y el contenido: 24–32.
- Antes de una zona de acciones al pie: 24, con un borde superior si además hay
  que separarla semánticamente.

## Densidad

| Densidad | Alto de fila / control | Cuándo |
|---|---|---|
| Compacta | **32–36 px** | Tablas de consulta, reportes, listados largos donde importa cuántas filas entran |
| Normal | **40–44 px** | Default administrativo: formularios, listados, detalle |
| Operativa / táctil | **48–52 px** | POS, acciones frecuentes, cualquier cosa que se toque con el dedo |

La densidad se elige por **tarea**, no por gusto, y es coherente dentro de una
pantalla: mezclar filas de 32 px con botones de 48 px en la misma región se lee
como un error de implementación.

En un POS, la densidad compacta es un defecto aunque entre más información: el
costo de errar un target durante una venta es mayor que el de scrollear
(`pos-patterns.md`).

## Grid y alineación

- Un solo grid por región. Los elementos de la región se alinean a sus columnas.
- **Alineación de borde izquierdo**: los inicios de bloque de una columna
  comparten el mismo eje x. Una sangría de 4 px que no significa nada se lee
  como error.
- Los formularios de una columna leen más rápido que los de dos, salvo que los
  campos sean cortos y estén relacionados (ciudad + código postal). Ver
  `forms-validation.md`.
- El ancho máximo de un contenedor de contenido evita líneas kilométricas en
  1920 px. Una tabla puede ocupar todo el ancho; un formulario, no (480–640 px).

## Whitespace

El espacio en blanco no es espacio "desperdiciado": es lo que separa los grupos y
lo que hace posible el escaneo. Pero tampoco es gratis en una pantalla operativa,
donde cada 100 px de aire son una fila menos de producto visible.

Criterio: **el whitespace se gasta en separar lo que hay que distinguir.** Aire
uniforme repartido en todos lados no ayuda a nadie — es aire sin jerarquía.

## Cuándo una card es necesaria y cuándo es ruido

Una `Card` (borde + fondo + sombra + padding) **agrega tres señales visuales a la
vez**. Se justifica cuando:

- El bloque es una **entidad independiente** que se puede accionar o navegar por
  separado.
- Hay **múltiples bloques hermanos** que compiten por el mismo espacio y hay que
  distinguirlos.
- El bloque tiene fondo distinto por una razón semántica (una superficie
  elevada, un panel).

**Es ruido cuando:**

- Hay una sola card en la pantalla: el borde no separa de nada.
- La card envuelve algo que ya estaba separado por espacio.
- Toda la pantalla es una grilla de cards del mismo tamaño → ver abajo.
- Hay cards anidadas dentro de cards.
- Se usa para agrupar dos campos de formulario que un `gap-8` ya agrupaba.

### Cómo evitar el layout que es sólo cards

El "muro de cards" —una grilla de N rectángulos iguales— tiene un problema
concreto: **elimina la jerarquía**. Si todo tiene el mismo peso visual, el
usuario tiene que leer las N cards para encontrar la que importa, en cada visita.

Alternativas, en orden de preferencia:

1. **Jerarquizar por tamaño**: la métrica que manda ocupa el doble; el resto va
   en una fila de valores más chicos. El ojo encuentra el foco solo.
2. **Sustituir cards por una lista o tabla** cuando los ítems son homogéneos y
   comparables. Comparar cinco números apilados en una columna es trivial;
   comparar cinco números en cinco cards separadas es un ejercicio de memoria
   (`tables-data-visualization.md`).
3. **Separar por espacio y encabezado** en vez de por borde: un `<h2>` + `gap-8`
   agrupa igual de bien y no agrega tres señales.
4. **Reservar la card** para lo que sí es navegable o accionable — que es
   exactamente el caso de `ReportNavCard` en este repo: cada card es un destino.

Regla práctica: si sacando todos los bordes y sombras la pantalla sigue
entendiéndose, las cards no estaban agrupando nada.

## Layout por tipo de pantalla

| Tipo | Estructura |
|---|---|
| Listado | Header (título + acción primaria) → filtros → tabla → paginación |
| Detalle | Header (nombre + acciones) → datos agrupados → historial / relacionados |
| Formulario | Título → grupos de campos en una columna → acciones al pie, la primaria a la derecha |
| Dashboard | Contexto temporal → 3–5 métricas jerarquizadas → 1–2 visualizaciones → tabla de detalle |
| POS | Dos regiones fijas: entrada + carrito (izquierda, mayor) y total + cobro (derecha, siempre visible) |

## Checklist de layout para una revisión

- [ ] No hay valores de espaciado arbitrarios (`p-[13px]`, `gap-[22px]`).
- [ ] El espacio entre grupos es ≥ 2× el espacio dentro de un grupo.
- [ ] El ritmo vertical es constante entre elementos del mismo tipo.
- [ ] La densidad es coherente dentro de cada región.
- [ ] La densidad corresponde al perfil de la pantalla.
- [ ] Los bordes izquierdos de una columna están alineados.
- [ ] El formulario tiene ancho máximo; no ocupa 1920 px.
- [ ] Cada `Card` agrupa algo que el espacio no podía agrupar.
- [ ] No hay cards anidadas.
- [ ] La pantalla no es una grilla de cards iguales sin jerarquía.
- [ ] Hay una acción primaria por región, y está donde termina la lectura.
