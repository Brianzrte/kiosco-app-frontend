# Responsive design

Referencia canónica de comportamiento responsive y validación móvil del
frontend de Mini Moni. El checklist ejecutable vive en
`../checklists/responsive-review.md`; acá está el porqué y el umbral.

## Postura: mobile-first, sin excepción de pantalla

**Toda pantalla se escribe mobile-first**: los estilos base son los del ancho
chico y los breakpoints **agregan** para pantallas mayores. Es el default de
Tailwind y ahora es también la regla del repo, sin excepciones por pantalla.

> **Resolución de una contradicción previa.** Hasta esta versión, este documento
> declaraba *desktop first* para `/pos`, `/reports*`, `/inventory` y
> `/receiving`. Esa regla queda derogada: producía pantallas que sólo se
> verificaban en resoluciones de mostrador y llegaban a móvil con overflow,
> acciones fuera de pantalla y tablas ilegibles. Lo que **sí sobrevive** de
> aquella regla es el hecho operativo que la motivaba: el POS y los reportes se
> usan mayormente en la PC del mostrador, así que sus viewports de 1024 × 768,
> 1280 × 720 y 1366 × 768 siguen siendo **prioritarios de verificación** y su
> layout tiene que aprovechar el ancho real. Mobile-first define **desde dónde
> se escribe el CSS**, no cuál es el caso de uso más frecuente ni qué viewport
> se optimiza al final.

Consecuencias prácticas:

- El diseño base arranca en **360 px** y es el viewport principal de referencia.
- La interfaz tiene que seguir siendo **funcional desde 320 px**: puede verse
  más apretada, no puede volverse inutilizable.
- Ninguna pantalla puede quedar sin una decisión responsive explícita. "Es de
  escritorio" no es una decisión: es una omisión.
- No todos los viewports tienen que verse igual. **Todos** tienen que permitir
  completar las acciones principales de la pantalla.
- No se escribe una media query para el modelo de un teléfono. El breakpoint lo
  decide el contenido, no el catálogo de dispositivos.

## Matriz de viewports

Se usa para diseñar, implementar y validar. No es una lista de dispositivos: son
los anchos donde el layout cambia de problema.

### Móvil vertical

```text
320 × 568    caso extremo de pantalla chica: piso de funcionalidad
360 × 640    angosta y de poca altura: rompe headers + acciones fijas
360 × 800    Android base — viewport principal de referencia
375 × 812    móvil angosto moderno
390 × 844    móvil moderno estándar
412 × 915    Android grande
414 × 896    móvil grande
430 × 932    móvil extra grande
```

### Móvil apaisado

```text
568 × 320    alto útil mínimo: el que rompe diálogos y formularios altos
812 × 375
844 × 390
915 × 412
```

### Tablet y escritorio

```text
768 × 1024   tablet vertical
1024 × 768   ← prioritario en POS: notebook vieja / monitor de mostrador
1280 × 720   ← prioritario en POS: monitor típico
1366 × 768   ← prioritario en POS: el portátil más común
1440 × 900
1920 × 1080
```

**Mínimo obligatorio de una revisión** (`../checklists/responsive-review.md`):

```text
320 × 568 · 360 × 640 · 360 × 800 · 390 × 844 · 414 × 896 · 430 × 932
844 × 390 · 768 × 1024 · 1280 × 720
```

En POS se agrega 1024 × 768 y 1366 × 768. Un POS que sólo se probó en
1920 × 1080 no está probado.

Cómo: DevTools → device toolbar → *Responsive* → escribir las dimensiones. En
una revisión se declara **qué viewports se miraron de verdad** y cuáles se
revisaron sólo leyendo el código. Un viewport no probado se reporta
`Not evaluated` / `Revisión estática`, nunca como aprobado.

## Estrategia de breakpoints

### Los del proyecto

La fuente son los breakpoints de Tailwind v4 tal como los usa hoy el repo
(`(app)/layout.tsx`, `Nav.tsx`, `SuppliersView.tsx`):

```text
base  0–639px    ← móvil: es donde se escribe el estilo por defecto
sm    640px
md    768px      ← el corte real del shell de este proyecto
lg    1024px
xl    1280px
2xl   1536px
```

### Los rangos que hay que cubrir

La recomendación general de rangos es:

```text
base            320–479   una columna, acciones apiladas, todo a ancho completo
sm-equivalente  480+      dos columnas cortas, acciones en línea
md              768+      tablet: sidebar/tabla/grilla de 2–3
lg              1024+     escritorio: layout completo
xl              1280+     escritorio ancho: más densidad, no más ancho de texto
```

**El proyecto no adopta `sm: 480px`.** Los breakpoints de Tailwind ya cubren
estos rangos con una sola diferencia: el tramo **480–639 px** cae en `base`, no
en `sm`. En la práctica eso es correcto para este producto — entre 480 y 639 px
casi todo sigue siendo un teléfono, y una columna sigue siendo la respuesta
correcta. Redefinir `--breakpoint-sm` en `@theme` afectaría a todas las
pantallas ya escritas: es una decisión de arquitectura visual que se registra en
el `design.md` de un change, no un ajuste que se hace de paso.

Si una pantalla concreta necesita de verdad un cambio de patrón en ~480 px, la
salida proporcional es `min-[480px]:` **en esa pantalla, anotado**, no un cambio
global de escala.

### Cuándo se introduce un breakpoint

Sólo cuando el contenido exige un **cambio de comportamiento**:

- una columna pasa a dos;
- un sidebar pasa a drawer;
- una tabla pasa a cards o a lista;
- una barra inferior pasa a navegación lateral;
- un modal pasa a bottom sheet o a pantalla completa;
- acciones apiladas pasan a mostrarse en línea.

Nunca para corregir una diferencia de unos píxeles. Si un componente rompe a
900 px, el problema casi siempre es un ancho fijo, no un breakpoint que falte.
Un breakpoint arbitrario (`min-[912px]:`) sin justificación anotada es un
hallazgo.

## Layout mobile-first

- Escribir primero el estilo de móvil; los `md:`/`lg:` **agregan**, no corrigen.
- Evitar anchos fijos en componentes de contenido. Preferir `w-full`,
  `max-width`, CSS Grid, Flexbox, `minmax()` y `clamp()`.
- Nada de valores absolutos atados a una resolución (`w-[1200px]`,
  `left-[420px]`).
- `min-width: 0` (`min-w-0`) en los hijos flex/grid que contienen texto: sin
  eso, un hijo con contenido largo se niega a encogerse y empuja el layout.
  Es la causa número uno de overflow horizontal en este tipo de app.
- Títulos, labels y grupos de acciones hacen wrap de forma controlada
  (`flex-wrap`, `gap`), no se salen ni se superponen.
- **No se oculta información crítica** sólo para que el layout entre.
- **No se achican tipografías ni controles** hasta volverlos ilegibles o
  intocables para que el layout entre. Si no entra, cambia el patrón de layout.

## Overflow horizontal

Una revisión tiene que detectar, obligatoriamente:

- scroll horizontal en `body` / la página;
- elementos con ancho fijo mayor al viewport;
- uso problemático de `100vw` (incluye la barra de scroll: `100vw` > ancho útil);
- contenedores flex cuyos hijos no pueden reducirse (falta `min-w-0`);
- tablas que fuerzan overflow sin una estrategia deliberada;
- textos largos sin corte: UUID, emails, códigos de barras, URLs, nombres de
  producto pegados;
- imágenes, gráficos, `canvas` o SVG que exceden el contenedor;
- botones o grupos de acciones que se salen de pantalla;
- modales más anchos o más altos que el viewport.

Para texto que no puede romperse solo: `break-words` / `overflow-wrap: anywhere`
en la celda o el contenedor, no en el `body`.

**`overflow-x: hidden` no es una solución cuando sólo esconde el problema.** Se
corrige primero el elemento que causa el desborde; recién después, si queda una
razón real (un elemento decorativo que sangra a propósito), se acota el overflow
al contenedor concreto — nunca al `body` como parche global.

**La página nunca scrollea horizontalmente.** Sólo un contenedor con scroll
deliberado y señalado.

## Altura de viewport

`100vh` en móvil miente: no descuenta la barra del navegador y no reacciona al
teclado virtual.

- Preferir `100dvh` para superficies que deben ocupar la pantalla (drawer,
  sheet, overlay a pantalla completa) — es lo que ya usa `MobileNavDrawer`.
- `100svh` cuando el contenido no puede quedar tapado ni por un instante al
  aparecer/desaparecer la barra del navegador.
- Un fallback razonable cuando importa (`min-height: 100vh; min-height: 100dvh;`)
  es aceptable; `100vh` **solo** no lo es.
- `calc(100vh - Xrem)` para acotar el alto de un diálogo tiene el mismo defecto:
  usar `dvh`.

Comprobar siempre con: barra del navegador visible y oculta, teclado virtual
abierto, pantalla de poca altura (568 px), apaisado (320–390 px de alto útil), y
modales/formularios/paneles con contenido largo.

## Safe areas

En barras fijas, headers, drawers, bottom sheets y navegación inferior, respetar
los insets del dispositivo:

```css
padding-bottom: env(safe-area-inset-bottom);
padding-top:    env(safe-area-inset-top);
padding-left:   env(safe-area-inset-left);
padding-right:  env(safe-area-inset-right);
```

En Tailwind: `pb-[env(safe-area-inset-bottom)]` — el patrón que ya usa la barra
inferior de `Nav.tsx`. Los insets laterales importan en apaisado con notch.

Ningún botón, total ni ítem de navegación puede quedar detrás del indicador del
sistema o del borde redondeado de la pantalla.

## Navegación en móvil

- Un sidebar de escritorio se transforma en drawer, sheet o navegación inferior
  cuando corresponde. No se inventa una navegación paralela para una pantalla:
  se usan las variantes del `Nav` existente.
- **Ninguna acción depende exclusivamente de `hover`.** En táctil no hay hover.
- El menú se abre y se cierra con teclado y con tacto.
- Al abrir un drawer, modal o sheet: el foco se mueve al componente, queda
  contenido cuando corresponde, `Escape` cierra, el foco vuelve al elemento
  disparador y el fondo no scrollea por detrás.
- La ruta o sección activa es visible, con `aria-current="page"` además del
  estilo.
- Las acciones principales quedan accesibles sin navegar por menús innecesarios.
- La navegación no puede tapar la acción primaria de la pantalla.

Detalle de foco y teclado: `navigation-keyboard.md`.

## Controles táctiles

- Área interactiva mínima **44 × 44 px** en cualquier superficie táctil, con
  ≥ 8 px de separación entre targets adyacentes. El mínimo legal es 24 px
  (`accessibility.md`), pero 24 px en un mostrador con un dedo apurado es un
  error garantizado. Un icono de 20 px dentro de un botón de 44 px cumple: se
  mide el área interactiva, no el dibujo.
- Las acciones destructivas quedan separadas de la primaria; no comparten borde.
- Estados `hover`, `active`, `focus-visible`, `disabled` y `loading` resueltos
  en todos los controles (`states-feedback.md`).
- Ninguna acción crítica depende de un icono ambiguo sin texto. Todo control
  sólo-icono lleva `aria-label` y, si es frecuente, un tooltip que **no** sea la
  única fuente de significado.
- Inputs, selects y botones con alto cómodo: 44–48 px en superficies táctiles.
- Los inputs de texto usan **≥ 16 px** de tamaño de fuente: por debajo, iOS hace
  zoom automático al enfocar y descoloca el layout.
- Los elementos interactivos no quedan pegados al borde seguro del dispositivo.

## Formularios

- **Una columna en anchos chicos.** Dos columnas sólo para pares cortos y
  relacionados, y se apilan cuando falta espacio.
- Labels visibles y asociados al input; el placeholder no es un label.
- El mensaje de error va junto al campo, con `role="alert"`, y **no depende sólo
  del color**: texto + icono o borde.
- El ancho del campo sugiere el largo esperado del dato.
- Tipos correctos: `email`, `tel`, `search`, `date` cuando corresponde. Para
  dinero y cantidades, `inputmode` antes que `type="number"`:
  `inputmode="numeric"` para cantidades, `inputmode="decimal"` para montos —
  `type="number"` trae spinners y comportamiento de rueda que no se quieren.
- `autocomplete` apropiado en datos personales y credenciales.
- La acción principal sigue visible con el teclado virtual abierto. La forma
  correcta es un pie **sticky dentro del contenedor del formulario** sobre alto
  `dvh`, no `position: fixed` al fondo del viewport: fijado al viewport, el
  teclado lo tapa o lo empuja fuera.
- Orden de tabulación lógico, coincidente con el orden visual.
- **Nunca** `user-scalable=no` ni `maximum-scale=1`.
- Un error nuevo no debe producir un salto de layout que mueva el control que el
  usuario está por tocar: reservar el espacio del mensaje o animar sólo opacidad.

Detalle: `forms-validation.md`.

## Tablas y datos densos

Una tabla de escritorio **no se comprime** automáticamente en móvil. Se elige
una estrategia explícita, según lo que el usuario hace con esos datos:

| # | Estrategia | Cuándo |
|---|---|---|
| 1 | Scroll horizontal deliberado dentro del contenedor, con señal visual y primera columna identificable | El usuario **compara** filas entre sí |
| 2 | Priorizar columnas: 3–4 visibles y el resto al expandir la fila | Hay una columna clave y varias secundarias |
| 3 | Lista de pares label/valor por registro | Cada registro se lee entero, no se compara |
| 4 | Fila → card en móvil (`md:hidden` + tabla `hidden md:block`) | El usuario **busca** un registro puntual y actúa sobre él |
| 5 | Fijar una columna clave (sticky) | Sólo cuando el scroll horizontal hace perder la identidad de la fila |
| 6 | Filtros o búsqueda para reducir densidad antes que reflow | El problema real es la cantidad de filas, no el ancho |

> **Resolución de una contradicción previa.** Este documento y
> `tables-data-visualization.md` prohibían convertir filas en cards, también en
> móvil. La prohibición era demasiado amplia: el repo ya usa correctamente el
> patrón cards-en-móvil / tabla-en-escritorio (`SuppliersView.tsx`), y en un
> ancho de 360 px una tabla de 6 columnas no conserva ninguna comparabilidad que
> proteger. La regla queda así: **la comparación manda.** Si la tarea es
> comparar, la tabla sobrevive con scroll deliberado (estrategia 1 o 2). Si la
> tarea es encontrar y operar sobre un registro, la card o la lista es correcta
> — y entonces la card es **plana**: sin la triple señal borde + sombra + fondo,
> con el dato clave primero y las acciones agrupadas. En escritorio se vuelve a
> la tabla. Card por fila **en escritorio** sigue prohibida.

Se rechaza como solución final, en cualquier viewport:

- texto ilegible o tipografía achicada para que entren las columnas;
- columnas tan angostas que el contenido se corta sin forma de leerlo;
- acciones superpuestas o pegadas entre sí;
- cualquier dato o acción que dependa de `hover`;
- scroll horizontal sin señal visual ni justificación;
- ocultar datos importantes sin una alternativa para consultarlos.

Detalle de densidad, columnas y alineación: `tables-data-visualization.md`.

## Modales, dialogs y sheets

- Evaluar en móvil si el modal de escritorio debería ser **bottom sheet** o
  **pantalla completa**. Un formulario de más de tres campos en 360 px casi
  siempre es pantalla completa.
- El ancho nunca supera el viewport: `w-[calc(100%-2rem)]` + `max-w-*`.
- La altura respeta el viewport dinámico (`max-h-[calc(100dvh-2rem)]`), no
  `100vh`.
- El contenido scrollea **por dentro**; la página no.
- Con contenido largo, el header y el pie de acciones pueden quedar fijos dentro
  del diálogo.
- El botón principal permanece alcanzable, también con el teclado virtual
  abierto.
- Existe una forma de cerrar visible y accesible: botón + `Escape`. No sólo
  gesto, no sólo click en el backdrop.
- Evitar diálogos chicos dentro de diálogos.
- Entra en apaisado (320–390 px de alto útil): es el caso que rompe los
  diálogos altos.

## Tipografía y contenido

- Texto base legible: 16 px de cuerpo, sin excepciones para "hacer entrar".
- Jerarquía visible entre título, subtítulo, contenido y metadata, también en
  360 px.
- Los títulos largos hacen wrap; no se truncan si son el identificador de la
  pantalla o de la fila.
- `line-clamp` sólo cuando existe una forma de ver el contenido completo
  (detalle, tooltip accesible, expandir).
- Números, dinero y cantidades: cifras tabulares (`.num`), alineación a la
  derecha y formato `formatMoney` — legibles en cualquier ancho, sin achicar
  decimales (`typography.md`).
- El zoom del navegador al 200 % y el aumento de tamaño de texto del sistema no
  destruyen el layout (WCAG 1.4.4). Un layout que depende de `vw` puro se rompe:
  `vw` no cambia con el zoom de texto.
- Probar con contenido realista y con casos largos, no con textos cortos
  ideales: nombres de producto de 60 caracteres, categorías largas, montos de
  siete dígitos.

## Imágenes, gráficos y multimedia

- `max-width: 100%` y proporción controlada; `object-fit` explícito cuando la
  imagen se recorta.
- Los gráficos se adaptan al contenedor: nada de ancho fijo en px.
- Ejes, leyendas y etiquetas siguen legibles en 360 px; si no entran, se rota el
  gráfico, se reduce la serie o se muestra el resumen numérico.
- Si el gráfico es interactivo, tiene control táctil; **ningún valor importante
  depende de `hover`**.
- Placeholders y skeletons imitan la geometría final para no producir layout
  shift (`performance-ux.md`).

## Rendimiento móvil

Señalar como hallazgo:

- imágenes sobredimensionadas para el tamaño en que se muestran;
- animaciones pesadas, blur, sombras o filtros excesivos (caros en GPU de gama
  media);
- componentes que se renderizan aunque estén ocultos (`hidden` no evita el
  render ni el fetch);
- listas largas sin paginación, virtualización o carga progresiva — este repo
  pagina por alto de viewport (`lib/pagination.ts`), y ese es el patrón;
- layout shifts;
- exceso de elementos fijos, que comen el viewport útil;
- cualquier recurso que castigue especialmente a un dispositivo de gama media o
  baja.

Las animaciones: con finalidad funcional, breves, respetando
`prefers-reduced-motion`, sin bloquear la interacción, sin provocar saltos de
layout y sin degradar el scroll táctil. El mecanismo se elige con el árbol de
decisión de `motion.md`; en pantallas operativas, ninguna supera 400 ms.

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
existe en escritorio, existe en móvil: en un drawer, en un menú, en el pie, pero
existe.

## Prioridad de acciones

Al angostar, la acción primaria de la región sobrevive intacta y a ancho
completo. Las secundarias se agrupan. Las terciarias pasan a un menú.

En móvil, la acción primaria de una pantalla de trabajo suele ir fija al pie con
ancho completo: es donde llega el pulgar y no depende del scroll. Esa barra
respeta `env(safe-area-inset-bottom)` y no tapa el último ítem de la lista —
se reserva su alto con padding en el contenedor scrolleable.

## Orientación y altura limitada

Ambas orientaciones funcionan; no se bloquea ninguna (WCAG 1.3.4). El alto útil
se olvida más seguido que el ancho:

- 1366 × 768 con la barra del navegador deja ~600 px útiles.
- Un móvil en apaisado deja ~320–390 px.
- Un diálogo alto tiene que scrollear por dentro, con su título y sus acciones
  fijos.
- Un header sticky de 80 px sobre un viewport de 600 px se come el 13 %.
- Comprobar 2.4.11 (*Focus Not Obscured*): tabular con la página scrolleada y
  verificar que el elemento enfocado no quede bajo el header.

## Las pantallas de Mini Moni

Perfil operativo por área. El detalle de POS vive en `pos-patterns.md`; acá está
sólo lo específicamente responsive.

| Pantalla | Uso real dominante | Verificación prioritaria |
|---|---|---|
| `/pos` | PC del mostrador | 1024 × 768, 1280 × 720, 1366 × 768 + móvil funcional |
| `/reports*` | PC del mostrador | 1280 × 720 + 360 × 800 con resumen numérico |
| `/inventory`, `/receiving` | Celular en el depósito | 360 × 800, 390 × 844 |
| `/products`, `/users`, `/categories`, `/suppliers` | Ambos | 360 × 800 y 1280 × 720 |
| `/login` | Ambos | 320 × 568 |

Todas se escriben mobile-first igual; la columna de la derecha dice dónde se
pone el esfuerzo de verificación, no dónde empieza el CSS.

### Pantalla de venta

En móvil, verificar:

- el buscador ocupa el ancho disponible;
- los resultados se operan con teclado **y** con tacto (la lista de sugerencias
  no depende de `hover` para marcar la opción activa);
- los ítems de la venta se muestran en cards o filas adaptables, con nombre,
  cantidad, precio unitario y total sin superponerse;
- los controles de cantidad son cómodos de tocar (≥ 44 px) y están separados
  del control de eliminar;
- eliminar un ítem no es demasiado fácil de disparar por accidente: no queda
  pegado a `+`/`−` ni bajo el pulgar de la acción frecuente;
- el total de la venta está visible sin scrollear, en todos los viewports;
- la acción `Cobrar` permanece accesible siempre;
- la barra inferior fija respeta `env(safe-area-inset-bottom)` y no tapa el
  último ítem del carrito;
- abrir el teclado no tapa el total ni la acción principal;
- los mensajes de stock insuficiente son visibles y comprensibles sin scroll
  lateral;
- las acciones frecuentes (escanear → cantidad → cobrar) no ganan pasos en
  móvil.

### Inventario

- La tabla pasa a cards o lista en móvil (estrategia 3 o 4): la tarea es buscar
  un producto y ajustarlo, no comparar veinte filas.
- Nombre, stock, precio y estado visibles sin expandir.
- `Editar` y `Ajustar stock` fáciles de encontrar, no escondidas tras un icono
  ambiguo.
- Los filtros se abren en drawer o sheet; el buscador y los filtros no se comen
  la pantalla ni empujan la lista fuera del primer scroll.
- Stock bajo o agotado **no depende sólo del color**: texto o icono además del
  badge (`color-system.md`).

### Reportes

- Los gráficos entran en el viewport sin scroll horizontal de página.
- Ejes y etiquetas legibles; si no entran, se reduce la serie o se rota.
- **Siempre hay un resumen numérico alternativo al gráfico**: en 360 px el
  número es la información, el gráfico es el apoyo.
- Los filtros de fecha funcionan en móvil (targets táctiles, sin dependencia de
  hover, sin calendario que se salga del viewport).
- Las tablas de detalle tienen estrategia responsive explícita.
- Los KPIs se muestran en una o dos columnas según el espacio, nunca en cuatro
  columnas de 80 px.
- El usuario no tiene que hacer zoom para interpretar un dato.

## Validación automatizada — propuesta pendiente

Hoy **no hay** Playwright, Cypress, Testing Library ni jsdom en este repo
(`ai/context/testing.md`): la verificación responsive es **manual**, con
`npm run dev` y las herramientas de navegador que la plataforma tenga
disponibles. Instalar un runner es una decisión de dependencias que se levanta
al usuario y se registra en el `design.md` de un change (`AGENTS.md` §5): este
skill **no** la toma.

Si esa decisión se toma alguna vez, la matriz de arriba se codifica una sola vez
y se reutiliza, en vez de repetir números por test:

```ts
export const responsiveViewports = {
  mobileSmall: { width: 320, height: 568 },
  mobileNarrow: { width: 360, height: 640 },
  mobileBase: { width: 360, height: 800 },
  mobileModern: { width: 390, height: 844 },
  mobileLarge: { width: 414, height: 896 },
  mobileXL: { width: 430, height: 932 },
  mobileLandscape: { width: 844, height: 390 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
  desktopPos: { width: 1366, height: 768 },
} as const;
```

Flujos smoke que justificarían el costo, en orden de valor: iniciar sesión;
abrir y cerrar la navegación; buscar un producto; agregarlo a una venta;
modificar la cantidad; eliminarlo; completar la venta; abrir inventario; buscar
y filtrar; abrir la edición de un producto; consultar un reporte; abrir y cerrar
un dialog o drawer.

En cada flujo, lo que se afirmaría es exactamente lo que hoy se revisa a mano:
ausencia de overflow horizontal (`scrollWidth <= clientWidth` en `body`),
elementos principales visibles, botones habilitados y alcanzables, diálogos
dentro del viewport, sin superposición entre contenido y barras fijas, y
comportamiento correcto con contenido largo.

## Checklist

El checklist ejecutable, con la matriz de viewports y el formato de reporte,
está en `../checklists/responsive-review.md`. No se duplica acá.
