# Iconografía

## Estado actual del proyecto

**Mini Moni no tiene librería de iconos de terceros, pero sí un set propio.**
`src/components/ui/icons.tsx` define ~28 iconos como SVG inline (`IconCart`,
`IconHistory`, `IconBox`, `IconLayers`, `IconTruck`, `IconTag`, `IconUsers`,
`IconChart`, `IconSearch`, `IconLogout`, `IconCash`, `IconCardPay`,
`IconTransfer`, `IconBarcode`, `IconAlert`, `IconCheckCircle`,
`IconInfoCircle`, `IconX`, `IconUserOff`, `IconMenu`, `IconSplit`,
`IconMinus`/`IconPlus`, `IconTrash`, `IconEye`/`IconEyeOff`,
`IconCalculator`), todos construidos sobre un único wrapper `Icon` interno:
`viewBox 0 0 24 24`, `stroke 1.75`, `round` caps/joins, `aria-hidden="true"` +
`focusable="false"` por defecto. Un grid óptico y un grosor ya están resueltos
— **la consistencia de trazo de este documento ya está aplicada**, no es
trabajo pendiente. Aparte de ese set, `src/components/reports/charts/` tiene
SVG propios que son gráficos, no iconos.

Consecuencias directas para este skill:

- **Antes de dibujar un SVG nuevo, revisar si ya existe en `icons.tsx`.** Un
  icono repetido con trazo o grid distinto rompe exactamente la consistencia
  que este documento pide.
- **No se recomienda instalar una librería de iconos.** El runtime es `next`,
  `react`, `react-dom` y nada más (`AGENTS.md` §5). Proponerlo es proponer una
  decisión de dependencia, que se levanta al usuario y se registra en el
  `design.md` de un change — no se resuelve en una recomendación de UI.
- Si hace falta un icono nuevo y puntual, se agrega a `icons.tsx` siguiendo el
  mismo wrapper `Icon` (24×24, stroke 1.75, round caps/joins) — no un SVG
  suelto en el componente que lo consume.
- La interfaz se sigue apoyando primero en texto — "Confirmar venta" es
  inequívoco; un icono de carrito, no — así que un icono es siempre decorativo
  junto a texto salvo los casos ya resueltos en `icons.tsx` con `aria-label` en
  el botón (p. ej. `IconEye`/`IconEyeOff` en el toggle de contraseña).
  Un hallazgo del estilo "faltan iconos" es inválido salvo que el texto por sí
  solo esté fallando en una tarea concreta y se pueda demostrar.

## Si algún día se agrega una librería

Prioridad, en orden:

1. **La biblioteca que el proyecto ya use.** Hoy: ninguna.
2. **Lucide** — outline, stroke consistente, tree-shakeable, sin dependencias.
3. **Phosphor** — más pesos disponibles, buena cobertura.
4. **Material Symbols** — variable, muy completa, más pesada.
5. **Fluent Icons** — buena para productos tipo Windows.

**Una sola familia.** Mezclar dos se nota inmediatamente: distinto grosor de
trazo, distinta terminación, distinto grid óptico. Es de los errores visuales
más visibles y más baratos de evitar.

## Consistencia de trazo

- Un solo grosor en toda la interfaz (típicamente 1.5 px o 2 px).
- El grosor **no** escala con el tamaño: un icono de 24 px con stroke 2 y uno de
  16 px con stroke 2 se ven de la misma familia. Si el stroke escala, no.
- Terminaciones (`stroke-linecap`, `stroke-linejoin`) iguales en todos.
- Todos sobre el mismo grid óptico (24 × 24 es el estándar), de modo que un
  icono "ancho" y uno "alto" pesen visualmente igual.

## Outline vs filled

| Estilo | Para qué |
|---|---|
| **Outline** | Default. Acciones, navegación no activa, iconos inline |
| **Filled** | Estado seleccionado o activo, alertas que necesitan peso |

El par outline/filled es una forma excelente de marcar selección **además** del
color — cumple "no sólo color" sin agregar texto. Un ítem de navegación activo
en filled + `aria-current="page"` se entiende en escala de grises.

No mezclar los dos estilos para el mismo rol en la misma vista.

## Icono decorativo vs funcional

Es la distinción que decide todo el marcado.

### Decorativo — acompaña a un texto que ya dice todo

```html
<button>
  <svg aria-hidden="true" focusable="false">…</svg>
  Confirmar venta
</button>
```

`aria-hidden="true"` para que el lector no lea "imagen imagen Confirmar venta".
`focusable="false"` porque en IE/Edge legacy los SVG podían recibir foco.

### Funcional — el icono **es** el control, no hay texto

```html
<button type="button" aria-label="Eliminar producto">
  <svg aria-hidden="true" focusable="false">…</svg>
</button>
```

El nombre accesible va en el **botón**, no en el SVG. Y siempre acompañado de un
`title`/tooltip visible al hover y al focus, porque un icono sin texto también es
ambiguo para quien ve.

### Icono que transmite estado

Lleva texto alternativo real (no `aria-hidden`) o un texto adyacente. Un ícono de
advertencia solo, sin texto, no comunica **qué** advierte.

## Tooltips

- Un botón que es sólo icono **necesita** tooltip.
- El tooltip aparece con hover **y con focus de teclado**. Sólo hover excluye a
  quien navega con teclado (`accessibility.md`).
- Delay de ~500 ms al entrar, 0 al salir.
- El tooltip **repite** el nombre accesible, no lo contradice: si el
  `aria-label` dice "Eliminar producto", el tooltip dice "Eliminar producto"
  (WCAG 2.5.3 *Label in Name*).
- Un tooltip no puede contener la única forma de acceder a una información
  necesaria, ni controles interactivos.
- Se cierra con `Escape` (WCAG 1.4.13).

## Tamaño visual vs tamaño interactivo

```text
Inline (junto a texto de 16px)   16 px
Acción (dentro de un botón)      20 px
Navegación                       20–24 px
Empty state                      32–48 px
```

**El área interactiva es siempre mayor que el dibujo.** Un icono de 20 px va
dentro de un botón de al menos 44 × 44 px en superficie táctil, o 32 × 32 px con
separación en una fila de tabla densa (`accessibility.md`, 2.5.8).

El error clásico: un `<button>` que envuelve exactamente el SVG y mide 20 × 20 px.
Cumple visualmente y falla como target.

Alineación con texto: el icono se centra ópticamente con la altura de la x, no
con la caja de línea. En la práctica suele necesitar 1 px de ajuste, y `flex` +
`items-center` resuelve la mayoría de los casos.

## Acciones destructivas

- El icono no alcanza. Una acción destructiva lleva **texto** o, como mínimo,
  confirmación (`states-feedback.md`).
- Un tacho de basura solo, sin texto y sin confirmación, en una fila de tabla:
  hallazgo `HIGH`. Junto a un botón de editar del mismo tamaño y color: la
  probabilidad de errar el clic es alta y el costo es asimétrico.
- Se separa físicamente de las acciones frecuentes (`design-principles.md`, ley
  de Fitts).
- Color `error` **más** texto o confirmación, nunca sólo el color.

## Metáforas reconocibles

Usar sólo iconos con significado establecido: lupa = buscar, tacho = eliminar,
lápiz = editar, `+` = agregar, `×` = cerrar, engranaje = configuración, flecha
= navegar.

**Ambiguos, evitar o acompañar siempre con texto:**

| Icono | Problema |
|---|---|
| Diskette | Casi nadie bajo 30 vio uno; sobrevive por convención, no por claridad |
| Tres puntos | "Más opciones" — no dice cuáles |
| Hamburguesa fuera de móvil | Esconde navegación sin explicar |
| Estrella | ¿Favorito, calificación, destacado? |
| Corazón | ¿Me gusta, guardar, favorito? |
| Nube | ¿Sincronizar, subir, bajar, backup? |
| Flecha circular | ¿Recargar, deshacer, reintentar, historial? |
| Ojo | ¿Ver, mostrar contraseña, visibilidad? |

Prueba: si hay que explicar el icono, poné el texto. **En un producto operativo
en español, el texto casi siempre gana.**

Además: los iconos no son universales entre culturas, y un producto en español
rioplatense no hereda automáticamente convenciones de otro mercado.

## Checklist de iconografía para una revisión

- [ ] No se agregó ninguna librería de iconos.
- [ ] Una sola familia, un solo grosor de trazo.
- [ ] Los iconos decorativos llevan `aria-hidden="true"` y `focusable="false"`.
- [ ] Los iconos funcionales tienen nombre accesible en el **botón**.
- [ ] Todo botón sólo-icono tiene tooltip, visible con hover **y** con focus.
- [ ] El tooltip coincide con el nombre accesible.
- [ ] El área interactiva es ≥ 44 px táctil / ≥ 32 px en tabla densa.
- [ ] Ninguna acción destructiva se comunica sólo con un icono.
- [ ] Ningún icono ambiguo aparece sin texto.
- [ ] El estado activo no depende sólo del color del icono.
