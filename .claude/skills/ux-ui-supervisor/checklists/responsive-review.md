# Checklist — Revisión responsive y móvil

Referencia: `../references/responsive-design.md`.

Se declara **qué viewports se probaron de verdad** y cuáles se revisaron sólo
leyendo el código. Un viewport no probado va como `Revisión estática` o
`Not evaluated`, nunca como aprobado.

## Viewports

### Mínimo obligatorio de una revisión

```text
[ ] 320 × 568    piso de funcionalidad
[ ] 360 × 640    angosta y de poca altura
[ ] 360 × 800    referencia principal
[ ] 390 × 844    móvil moderno estándar
[ ] 414 × 896    móvil grande
[ ] 430 × 932    móvil extra grande
[ ] 844 × 390    apaisado
[ ] 768 × 1024   tablet vertical
[ ] 1280 × 720   escritorio
```

### Adicionales

```text
[ ] 375 × 812 · 412 × 915          variantes de ancho móvil
[ ] 568 × 320 · 812 × 375 · 915 × 412   apaisado
[ ] 1024 × 768   ← obligatorio en POS
[ ] 1366 × 768   ← obligatorio en POS
[ ] 1440 × 900 · 1920 × 1080
```

En POS, 1024 × 768 y 1366 × 768 se agregan al mínimo obligatorio.

DevTools → device toolbar → *Responsive* → escribir las dimensiones.

## Estructura

- [ ] La pantalla está escrita mobile-first: el estilo base es el de móvil y los
      breakpoints agregan.
- [ ] Funciona desde 320 px: se puede completar la tarea principal.
- [ ] No hay scroll horizontal accidental en la **página** en ningún viewport.
- [ ] Ningún contenido crítico queda fuera del viewport, cortado o superpuesto.
- [ ] El layout cambia de patrón cuando el espacio lo requiere, en vez de sólo
      encogerse.
- [ ] Tablet y escritorio siguen funcionando después de los cambios de móvil.
- [ ] Ningún hijo flex/grid con texto largo carece de `min-w-0`.
- [ ] Ningún ancho fijo mayor al viewport; ningún `100vw` problemático.
- [ ] Ningún `overflow-x: hidden` tapando un desborde estructural sin corregir.
- [ ] Los textos largos (UUID, email, código, URL, nombre de producto) tienen
      estrategia de corte.

## Breakpoints

- [ ] Se usan los breakpoints de Tailwind (`sm`/`md`/`lg`/`xl`/`2xl`).
- [ ] Cada breakpoint introducido corresponde a un cambio real de patrón
      (columnas, sidebar→drawer, tabla→cards, modal→sheet, acciones en línea).
- [ ] No hay breakpoints arbitrarios (`min-[912px]:`) sin justificación anotada.
- [ ] No hay media queries atadas a un modelo de dispositivo.
- [ ] Los `clamp()` tienen mínimo y máximo explícitos.
- [ ] No hay `clamp()` en texto de cuerpo.

## Navegación

- [ ] El sidebar/menú de escritorio está adaptado a móvil (drawer, sheet o barra
      inferior), sin inventar una navegación paralela.
- [ ] Los menús se operan con tacto **y** con teclado.
- [ ] Ninguna acción o dato depende exclusivamente de `hover`.
- [ ] La sección activa es visible, con `aria-current="page"`.
- [ ] Drawers y dialogs mueven el foco al abrir, lo contienen, cierran con
      `Escape` y lo restauran al cerrar.
- [ ] El fondo no scrollea detrás de un overlay abierto.
- [ ] La navegación no tapa la acción primaria.

## Interacción táctil

- [ ] Targets ≥ 44 × 44 px con ≥ 8 px de separación.
- [ ] Las acciones destructivas están separadas de la primaria.
- [ ] `hover`, `active`, `focus-visible`, `disabled` y `loading` resueltos.
- [ ] Todo control sólo-icono tiene nombre accesible (`aria-label`).
- [ ] Inputs, selects y botones con alto cómodo (44–48 px en táctil).
- [ ] Ningún elemento interactivo pegado al borde seguro del dispositivo.

## Contenido

- [ ] Los títulos largos hacen wrap y no rompen el layout.
- [ ] No se oculta información crítica para que el layout entre.
- [ ] `line-clamp` sólo donde hay forma de ver el contenido completo.
- [ ] Ninguna tipografía se achicó por debajo del piso de legibilidad.
- [ ] Dinero y números conservan cifras tabulares, alineación y decimales.
- [ ] Zoom del navegador al 200 % sin pérdida de contenido ni funcionalidad.
- [ ] No hay `user-scalable=no` ni `maximum-scale=1`.
- [ ] El layout no depende de `vw` puro para su estructura.
- [ ] Probado con contenido largo y realista, no sólo con textos cortos.

## Formularios

- [ ] Una sola columna en anchos chicos; los pares se apilan cuando falta
      espacio.
- [ ] Labels visibles y asociados; errores junto al campo y con `role="alert"`.
- [ ] El error no depende sólo del color.
- [ ] Tipos correctos (`email`, `tel`, `search`, `date`) e `inputmode`
      apropiado (`numeric` para cantidades, `decimal` para montos).
- [ ] `autocomplete` apropiado donde corresponde.
- [ ] Los inputs de texto usan ≥ 16 px (sin zoom automático en iOS).
- [ ] La acción principal sigue visible con el teclado virtual abierto, con pie
      sticky dentro del formulario, no `fixed` al viewport.
- [ ] El orden de tabulación coincide con el orden visual.
- [ ] Un error nuevo no produce un salto de layout que mueva el control activo.

## Tablas y cards

- [ ] La tabla tiene una estrategia móvil explícita y declarada.
- [ ] La estrategia coincide con la tarea: comparar → tabla con scroll
      deliberado; buscar y operar → cards o lista.
- [ ] El scroll horizontal, si existe, está en el contenedor, es deliberado y
      tiene señal visual.
- [ ] La primera columna o el dato clave sigue identificable al scrollear.
- [ ] Ninguna columna queda ilegible ni con texto achicado.
- [ ] Las acciones de fila no se superponen ni dependen de `hover`.
- [ ] El usuario puede acceder a todos los datos importantes.
- [ ] En escritorio no hay una card por fila.
- [ ] Las cards de móvil son planas: no acumulan borde + sombra + fondo.
- [ ] El encabezado sticky no tapa el elemento enfocado.
- [ ] La paginación es alcanzable sin recorrer toda la tabla.

## Modales y overlays

- [ ] Entran dentro del viewport en ancho y en alto.
- [ ] Usan altura dinámica (`dvh`/`svh`), no `100vh` ni `calc(100vh - …)`.
- [ ] El contenido largo scrollea por dentro; la página no.
- [ ] El teclado virtual no tapa el campo activo ni la acción principal.
- [ ] Respetan las safe areas.
- [ ] Se cierran con botón visible **y** con `Escape`.
- [ ] Se evaluó si en móvil corresponde bottom sheet o pantalla completa.
- [ ] Entran en apaisado (~320–390 px de alto útil).
- [ ] No hay diálogos dentro de diálogos.

## Altura y safe areas

- [ ] Verificado con la barra del navegador visible y oculta.
- [ ] Verificado con el teclado virtual abierto.
- [ ] Verificado en 320 × 568 y en apaisado.
- [ ] Las barras fijas usan `env(safe-area-inset-*)` donde corresponde.
- [ ] Ninguna barra fija tapa el último ítem de una lista scrolleable.
- [ ] El header sticky no se come una porción desproporcionada del viewport.
- [ ] Tabulando con la página scrolleada, el foco nunca queda bajo el header
      (WCAG 2.4.11).

## Visual y rendimiento

- [ ] La jerarquía visual se conserva en móvil.
- [ ] No hay densidad excesiva ni cards apretadas.
- [ ] Las animaciones respetan `prefers-reduced-motion`.
- [ ] No hay efectos costosos (blur, sombras grandes, filtros) en listas o
      scroll.
- [ ] Imágenes y gráficos son responsive (`max-width: 100%`, `object-fit`).
- [ ] Los gráficos interactivos no dependen de `hover` para un valor importante.
- [ ] Las listas largas paginan, virtualizan o cargan progresivamente.
- [ ] No hay layout shifts evidentes; los skeletons imitan la geometría final.

## Específico de POS

- [ ] El total está visible sin scrollear en todos los viewports, incluidos
      360 × 800 y 1024 × 768.
- [ ] El botón de cobro está visible y alcanzable siempre.
- [ ] La región de cobro no scrollea; sólo scrollea el carrito.
- [ ] El campo de escaneo está visible en todos los viewports de POS.
- [ ] Eliminar un ítem no queda pegado a los controles de cantidad.
- [ ] La barra inferior fija respeta `env(safe-area-inset-bottom)`.
- [ ] Verificado en 1024 × 768, 1280 × 720 y 1366 × 768.

## Severidad de un hallazgo responsive

Se usa el modelo del `SKILL.md`, sin vocabulario paralelo:

| Severidad | Qué la produce en móvil |
|---|---|
| `BLOCKER` | Impide completar la tarea: no se puede cobrar, un botón principal queda fuera de pantalla, un modal no se puede cerrar, el teclado tapa permanentemente la acción requerida, una sección queda inaccesible |
| `HIGH` | La tarea se completa con error o mucho esfuerzo: scroll horizontal general, acciones táctiles superpuestas, tabla esencial ilegible, formulario difícil de completar, contenido crítico truncado |
| `MEDIUM` | Usabilidad o consistencia: controles chicos, espaciado deficiente, jerarquía confusa, cards demasiado densas, estados poco claros |
| `LOW` | Pulido: espaciado menor, alineación, consistencia entre componentes, transiciones |

## Cómo reportar

```markdown
## Mobile & Responsive Summary

- Estado general: PASS | PASS WITH OBSERVATIONS | FAIL
- Viewports probados: 360 × 800, 390 × 844, 1280 × 720
- Revisión estática (no probados): 320 × 568, 430 × 932, 844 × 390
- Hallazgos: 0 BLOCKER · 2 HIGH · 3 MEDIUM · 1 LOW
- Riesgo principal para completar la tarea: <una frase>

| Viewport | Estado | Problemas principales |
|---|---|---|
| 320 × 568 | Not evaluated | revisión estática |
| 360 × 800 | FAIL | RESP-01 |
| 390 × 844 | PASS | — |
| 1280 × 720 | PASS | — |

Hallazgos:
- RESP-01 (HIGH) — en 360 × 800 la barra de acciones desborda a la derecha
  (`PosView.tsx:142`, `flex` sin `min-w-0` en el hijo del nombre).
```

Cada hallazgo lleva los nueve campos del `SKILL.md`, incluida la **ubicación
concreta** (archivo:línea o regla CSS) y el **viewport donde se reproduce**. Un
hallazgo que dice "falta responsive" sin componente ni viewport no es un
hallazgo.
