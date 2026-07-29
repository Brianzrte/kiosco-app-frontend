# Responsive design

## Mobile first o desktop first

No hay una respuesta universal: depende del perfil de la pantalla.

**Mobile first** (estilos base para el ancho chico, `md:` y `lg:` agregan) cuando
la pantalla puede usarse en un teléfono de verdad: consulta, lectura, un
formulario corto. Es el default de Tailwind y el default del repo.

**Desktop first** (diseñar para 1280–1366 y degradar) cuando la tarea es
operativa de escritorio y el móvil es un caso secundario: el POS, las tablas de
reporte, la recepción de mercadería. Diseñar el POS en 360 px primero produce un
layout de una columna que después no aprovecha el ancho real del mostrador.

En Mini Moni:

| Pantalla | Enfoque | Motivo |
|---|---|---|
| `/pos` | Desktop first | Se usa en la PC del mostrador. Móvil: no es un caso real hoy |
| `/reports*` | Desktop first | Tablas y gráficos que necesitan ancho |
| `/inventory`, `/receiving` | Desktop first, usable en móvil | Se consulta stock desde el celular en el depósito |
| `/products`, `/users`, `/categories` | Mobile first | Consulta y ABM, cabe en una columna |
| `/login` | Mobile first | Trivial |

Sea cual sea el enfoque, **el resultado tiene que funcionar en los dos
extremos**. El enfoque decide desde dónde se empieza, no qué se abandona.

## Breakpoints

**La fuente principal son los breakpoints del proyecto**, es decir los defaults
de Tailwind v4 tal como se usan hoy en `(app)/layout.tsx` y `Nav.tsx`:

```text
sm   640px
md   768px    ← el corte real del shell de este proyecto
lg   1024px
xl   1280px
2xl  1536px
```

Reglas:

- **No inventar un breakpoint nuevo** para una pantalla. Si un componente rompe
  a 900 px, el problema casi siempre es un ancho fijo, no un breakpoint que
  falte.
- Un breakpoint arbitrario (`min-[912px]:`) es un hallazgo salvo que esté
  justificado por un contenido concreto y anotado.
- El breakpoint se elige por **dónde se rompe el contenido**, no por el tamaño
  de un dispositivo de moda.

## Container queries

Un breakpoint mira el **viewport**; un componente reutilizable no sabe en qué
ancho lo van a montar. Una card que se ve bien a ancho completo se rompe en una
columna de 320 px del mismo viewport de 1440 px.

```css
@container (min-width: 400px) { ... }
```

En Tailwind v4: `@container` en el padre + `@sm:`, `@md:` en los hijos, sin
plugin.

Cuándo usarlas: un componente que se monta en más de un contexto de ancho —
`ReportNavCard`, una card de métrica, una fila de resumen. Cuándo **no**: el
layout de una página, que sí depende del viewport.

No es una recomendación de migrar nada: es la herramienta correcta cuando
aparece el problema de "se ve bien en una página y mal en otra".

## `clamp()`

```css
font-size: clamp(1.5rem, 1rem + 2vw, 2rem);
```

Útil cuando un valor debe variar de forma continua y el salto discreto de un
breakpoint se nota (un título grande, el padding de un contenedor ancho).

Límites:

- **Siempre con mínimo y máximo explícitos.** Un `clamp` sin techo produce
  títulos de 60 px en 1920.
- El mínimo respeta el piso de legibilidad (`typography.md`).
- No usar `clamp` en texto de cuerpo: 16 px es 16 px en todos los anchos.
- No usar `vw` puro sin `clamp`: rompe el zoom del navegador (WCAG 1.4.4).

## Reflow antes que ocultamiento

**Ocultar contenido es la última opción, no la primera.** En orden:

1. **Reflow** — la grilla de 3 columnas pasa a 1; el formulario de 2 pasa a 1.
2. **Reordenar** — lo importante primero en el orden vertical. Ojo con el orden
   de foco (`accessibility.md`).
3. **Comprimir** — menos padding, densidad más compacta, abreviar un label.
4. **Reagrupar** — un grupo de acciones pasa a un menú, una columna secundaria
   pasa a una fila de detalle.
5. **Diferir** — el detalle se abre en un drawer o en una fila expandible.
6. **Ocultar** — sólo contenido genuinamente redundante, y **nunca** una acción
   que el usuario necesita para completar la tarea.

Un `hidden md:block` sobre un botón de acción es un hallazgo. Si la acción
existe en desktop, existe en móvil: en un drawer, en un menú, en el pie, pero
existe.

## Prioridad de acciones

Al angostar, la acción primaria de la región sobrevive intacta y a ancho
completo. Las secundarias se agrupan. Las terciarias pasan a un menú.

En móvil, la acción primaria de una pantalla de trabajo suele ir fija al pie con
ancho completo: es donde llega el pulgar y no depende del scroll.

## Tablas responsive

Una tabla no se convierte automáticamente en cards. Opciones, por orden de
preferencia:

1. **Scroll horizontal dentro del contenedor** con la primera columna sticky.
   Es lo que ya hace `Table` de este repo (contenedor con scroll). Conserva la
   comparabilidad, que es todo el punto de una tabla
   (`tables-data-visualization.md`).
2. **Priorizar columnas**: se muestran las 3–4 que importan y el resto se ve al
   expandir la fila.
3. **Fila expandible**: la fila muestra lo clave y despliega el detalle.
4. **Lista de items** (no cards): un bloque por registro, con el dato clave
   primero. Sirve cuando el usuario **busca** un registro, no cuando **compara**
   varios.

Lo que **nunca**: envolver cada fila en una `Card` con borde y sombra. Se
triplica el alto, se pierde la alineación de columnas y comparar deja de ser
posible.

**La página nunca scrollea horizontalmente.** Sólo el contenedor de la tabla.

## Drawers y overlays

- Un drawer en móvil resuelve filtros, detalle y formularios secundarios sin
  perder el contexto de la lista.
- El drawer atrapa el foco y lo devuelve al cerrar, como cualquier overlay
  (`navigation-keyboard.md`).
- Debe cerrarse con Escape y con un botón visible, no sólo con gesto.
- En pantallas de poca altura, el contenido del drawer scrollea; sus acciones
  quedan fijas al pie.

## Navegación

- El `Nav` de este repo ya tiene variantes `md:`. Cualquier ítem nuevo hereda ese
  comportamiento; no se inventa una navegación paralela para una pantalla.
- En móvil, la navegación no puede tapar la acción primaria.
- El ítem activo se marca con `aria-current="page"` además de con estilo.

## Formularios

- **Una columna en todos los anchos** salvo pares cortos y relacionados.
- El ancho del campo sugiere el largo esperado del dato: un campo de código
  postal ancho de 600 px miente.
- El teclado móvil correcto: `inputmode="numeric"` para cantidades,
  `inputmode="decimal"` para montos. Un `type="number"` en un campo de dinero
  trae spinners que no se quieren.
- Las acciones del formulario no quedan tapadas por el teclado virtual: al pie
  del formulario, no fijas al fondo del viewport.

## Touch targets

Mínimo **44 × 44 px** en cualquier superficie táctil, con al menos 8 px de
separación entre targets adyacentes. El mínimo legal es 24 px
(`accessibility.md`), pero 24 px en un mostrador con un dedo apurado es un error
garantizado.

Un icono de 20 px dentro de un botón de 44 px cumple: lo que se mide es el área
interactiva, no el dibujo.

## Zoom

- Zoom del navegador al 200 % sin pérdida de contenido ni funcionalidad.
- Nunca `user-scalable=no` ni `maximum-scale=1`.
- Un layout que sólo funciona con `vw` se rompe al hacer zoom: el `vw` no cambia
  con el zoom de texto.

## Orientación

Ambas orientaciones funcionan; no se bloquea ninguna (WCAG 1.3.4). En apaisado
el alto útil cae a ~360 px: es el caso que rompe los diálogos altos y los
formularios con acciones fijas al pie.

## Altura limitada

Se olvida más seguido que el ancho:

- 1366 × 768 con la barra del navegador deja ~600 px útiles.
- Un móvil en apaisado deja ~340 px.
- Un diálogo alto tiene que scrollear **por dentro**, con su título y sus
  acciones fijos.
- Un header sticky de 80 px sobre un viewport de 600 px se come el 13 %.
- Comprobar 2.4.11 (*Focus Not Obscured*): tabular con la página scrolleada y
  verificar que el elemento enfocado no quede bajo el header.

## Viewports mínimos de revisión

```text
360 × 800      móvil chico
768 × 1024     tablet vertical
1024 × 768     ← POS: notebook vieja / monitor de mostrador
1280 × 720     ← POS: monitor típico
1366 × 768     ← POS: el portátil más común
1440 × 900
1920 × 1080
```

Para POS, los tres marcados son **prioritarios**: son las resoluciones reales de
una PC de mostrador. Un POS que sólo se probó en 1920 × 1080 no está probado.

Cómo: DevTools → device toolbar → *Responsive* → escribir las dimensiones.
En una revisión se declara **qué viewports se miraron**; los que no, van como
`Not evaluated`.

## Checklist responsive para una revisión

- [ ] Verificado en 360 × 800, 1024 × 768 y 1280 × 720 como mínimo.
- [ ] En POS, verificado además en 1366 × 768.
- [ ] La página no scrollea horizontalmente en ningún viewport.
- [ ] Ninguna acción necesaria está oculta en móvil.
- [ ] La acción primaria sigue siendo alcanzable sin scroll horizontal.
- [ ] Los targets táctiles son ≥ 44 px con ≥ 8 px de separación.
- [ ] La tabla scrollea dentro de su contenedor, no la página.
- [ ] Ninguna fila de tabla se convirtió en card con borde y sombra.
- [ ] Zoom al 200 % sin pérdida de contenido ni funcionalidad.
- [ ] Los diálogos scrollean por dentro y sus acciones quedan visibles.
- [ ] No se agregaron breakpoints arbitrarios.
- [ ] El orden de foco sigue coincidiendo con el orden visual después del reflow.
