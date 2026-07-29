# Navegación con teclado

En un POS el teclado no es una alternativa accesible: es **la** vía de entrada.
El cajero tiene una mano en el lector y la otra en el teclado. Cada vez que el
flujo obliga a agarrar el mouse, la venta se frena.

Referencia normativa: WCAG 2.1.1, 2.1.2, 2.4.3, 2.4.7 y la WAI-ARIA Authoring
Practices Guide (`sources.md`).

## Teclas y su contrato

| Tecla | Significa |
|---|---|
| `Tab` | Siguiente elemento tabulable |
| `Shift+Tab` | Anterior |
| `Enter` | Activar el control por defecto / enviar el formulario / confirmar la opción resaltada |
| `Space` | Activar un `<button>`, marcar un checkbox, abrir un `<select>`. **No** envía un formulario |
| `Escape` | Cancelar el contexto actual: cerrar overlay, descartar sugerencias, salir de edición |
| `ArrowDown` / `ArrowUp` | Moverse dentro de un grupo: opciones, filas, ítems de menú |
| `ArrowLeft` / `ArrowRight` | Moverse entre tabs, entre columnas de una grilla, entre segmentos |
| `Home` / `End` | Primer / último elemento del grupo |
| `PageUp` / `PageDown` | Saltar de a bloque en listas muy largas (opcional) |

Distinción clave: **`Tab` se mueve entre componentes; las flechas se mueven
dentro de un componente.** Una lista de 200 productos con cada ítem tabulable
obliga a 200 `Tab` para pasarla de largo. Correcto: el contenedor recibe un solo
tab stop y las flechas navegan adentro.

## Orden de foco

El orden de tabulación coincide con el orden visual y funcional. Se rompe con
`order`, `row-reverse`, grid explícito o insertando el DOM en otro orden que el
visual.

- **`tabindex` positivo: nunca.** Rompe el orden de toda la página.
- `tabindex="0"` para hacer tabulable algo que no lo es de nativo.
- `tabindex="-1"` para enfocar por script sin agregar un tab stop.

Verificación: tabular la pantalla de punta a punta y anotar el recorrido. Si hay
que mirar el DOM para entenderlo, está mal.

## Foco visible

`globals.css` define el indicador global:

```css
:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
```

**No se quita en ningún componente.** Un `outline: none` sin reemplazo
equivalente es un hallazgo `HIGH` por sí solo. Si el outline queda tapado por un
`overflow: hidden` del padre, el `outline-offset` lo empuja fuera: se resuelve
con padding en el contenedor, no eliminando el outline.

## Foco inicial

Al entrar a una pantalla de trabajo, el foco va donde empieza la tarea:

| Pantalla | Foco inicial |
|---|---|
| POS | Campo de escaneo |
| Formulario de alta | Primer campo |
| Formulario de edición | Primer campo, **sin** seleccionar el contenido |
| Listado | Ningún foco forzado — el usuario decide |
| Diálogo de confirmación | El botón menos destructivo, o el diálogo |
| Diálogo con formulario | El primer campo |

**No** se roba el foco en una pantalla de consulta: interrumpe al usuario que
está leyendo y descoloca al lector de pantalla.

## Restauración del foco

Es el defecto de teclado más frecuente y el más caro en un flujo operativo.

Después de una acción que re-renderiza, el foco debe quedar en un lugar
**deliberado**. Si el elemento enfocado desaparece del DOM, el navegador manda
el foco a `<body>` y el siguiente `Tab` arranca desde el principio de la página.

| Situación | Dónde va el foco |
|---|---|
| Se cierra un modal | Al elemento que lo abrió |
| Se cierra un drawer o popover | Al disparador |
| Se agrega un ítem al carrito | De vuelta al campo de escaneo |
| Se elimina una fila | A la fila siguiente, o a la anterior si era la última |
| Se envía un formulario con error | Al primer campo con error |
| Se envía un formulario con éxito y se navega | Al `<h1>` del destino |
| Se completa una acción y se queda en la pantalla | Al disparador, si sigue existiendo |

En React el foco debe aplicarse **después** del re-render. El patrón que ya usa
el POS de este repo:

```ts
requestAnimationFrame(() => scanRef.current?.focus());
```

Los primitives `Input` y `Select` reenvían `ref` justamente para esto.

## Focus trap en modales

Un modal debe:

1. Atrapar el foco: `Tab` en el último control vuelve al primero.
2. Cerrar con `Escape`.
3. Devolver el foco al disparador al cerrar.
4. Marcar el fondo como inerte para el lector.

`<dialog>` + `showModal()` **ya hace las cuatro cosas de forma nativa**, y es lo
que usa el `Dialog` de este repo. Implementar un focus trap a mano acá es
trabajo redundante y una fuente de bugs.

Lo que sí hay que revisar en el `Dialog` del repo:

- Con `dismissible={false}` (acción en curso), Escape y backdrop están
  bloqueados a propósito. Verificar que exista una salida cuando la acción
  termina — un modal sin salida es `BLOCKER`.
- El foco inicial dentro del diálogo es deliberado, no el primer elemento por
  accidente.
- El retorno del foco al disparador funciona cuando el disparador se
  re-renderizó.

## Cerrar overlays

Todo overlay cierra con `Escape`: modal, drawer, dropdown, popover, tooltip
persistente, lista de sugerencias.

Comportamiento en cascada: si hay un dropdown abierto **dentro** de un modal,
`Escape` cierra primero el dropdown, y el segundo `Escape` cierra el modal.
Cerrar los dos de una es un hallazgo: el usuario pierde el contexto.

## Combobox y autocompletado

El patrón, tal como lo define la APG:

```text
ArrowDown   siguiente opción (y abre la lista si está cerrada)
ArrowUp     opción anterior
Enter       seleccionar la opción resaltada
Escape      cerrar la lista y conservar lo tipeado
Home / End  primera / última opción, cuando la lista es larga
Tab         cerrar la lista y salir del campo
```

Reglas adicionales:

- Al abrir, **ninguna** opción resaltada por defecto (o la primera, si el patrón
  es de autocompletado inline). Nunca una opción del medio.
- La navegación con flechas **no** modifica el texto del input hasta seleccionar.
- La opción resaltada scrollea a la vista.
- Escape restaura lo que el usuario tipeó, no lo borra.
- El conteo de resultados se anuncia con `aria-live="polite"`.

### `aria-activedescendant`

En un combobox, el foco del DOM **se queda en el input** — hay que poder seguir
escribiendo mientras se navega la lista. Entonces el foco visual y el foco del
DOM se separan, y hay que decírselo al lector:

```html
<input
  role="combobox"
  aria-expanded="true"
  aria-controls="results"
  aria-activedescendant="opt-3"
  aria-autocomplete="list"
/>
<ul id="results" role="listbox">
  <li id="opt-3" role="option" aria-selected="true">…</li>
</ul>
```

`aria-activedescendant` apunta al `id` de la opción resaltada. El lector la
anuncia sin que el foco del DOM se mueva.

Cuándo usarlo: sólo cuando el foco tiene que quedarse en otro lado (combobox,
grid con edición). En un menú o un listbox normal, mover el foco real con
`.focus()` es más simple y más robusto.

## Otros patrones

| Componente | Teclado |
|---|---|
| Tabs | `ArrowLeft`/`ArrowRight` entre tabs, `Tab` sale al panel. Un solo tab stop en la lista |
| Menú | `ArrowDown`/`ArrowUp` entre ítems, `Escape` cierra y devuelve el foco al botón |
| Tabla con acciones | `Tab` entra a la fila, flechas entre celdas si es una grilla; si no, `Tab` normal |
| Radios | Flechas eligen (no `Tab`); el grupo es un solo tab stop |
| Checkboxes | `Tab` entre ellos, `Space` marca |
| Toggle | `Space` o `Enter`; el estado se anuncia con `aria-pressed` o `aria-checked` |
| Paginación | Botones normales; `aria-current="page"` en la actual |

## Atajos

- **Un atajo que no se ve, no existe.** Se muestra junto a la acción ("F2 ·
  Cobrar") o en una ayuda accesible desde la pantalla.
- No pisar atajos del navegador (`Ctrl+T/W/N/L/R/F`, `Ctrl+Shift+*`, `F5`,
  `F6`, `F11`, `F12`, `Alt+←`).
- No pisar atajos de lectores de pantalla: NVDA y JAWS usan `Insert`, `Caps
  Lock` y muchas combinaciones con letras sueltas. **Nunca** una letra sola como
  atajo global.
- Un atajo de una sola tecla debe poder desactivarse o estar limitado a cuando
  el foco está en un componente concreto (WCAG 2.1.4).
- `F2`–`F9` son razonablemente seguras en un POS de escritorio.
- El atajo no reemplaza al control visible: lo acelera.

## Trampas de teclado

WCAG 2.1.2: no puede haber ningún lugar del que no se pueda salir con teclado.
Los casos reales:

- Un widget que captura las flechas y no libera el `Tab`.
- Un `keydown` con `preventDefault()` incondicional.
- Un iframe embebido sin salida.
- Un modal que no cierra con Escape y cuyo botón de cierre no es tabulable.

## Verificación

No hay tests automáticos de teclado en este repo. La verificación es manual y se
reporta como tal:

1. Guardar el mouse. Literalmente.
2. Recorrer el flujo completo sólo con teclado, de principio a fin.
3. Anotar cada punto donde el foco se pierde, salta o se vuelve invisible.
4. Repetir el flujo abriendo y cerrando cada overlay con Escape.
5. Comprobar el retorno del foco después de cada acción que re-renderiza.

Un flujo que no se puede completar sin mouse es `BLOCKER` en el POS y `HIGH` en
el resto.

## Checklist de teclado para una revisión

- [ ] El flujo principal se completa entero sin mouse.
- [ ] El orden de foco coincide con el orden visual y funcional.
- [ ] Ningún `tabindex` positivo.
- [ ] El foco es visible en todos los controles; ningún `outline: none` sin
      reemplazo.
- [ ] El foco inicial es deliberado en las pantallas de trabajo.
- [ ] El foco vuelve al disparador al cerrar cada overlay.
- [ ] El foco no cae en `<body>` después de ninguna acción.
- [ ] Todo overlay cierra con Escape; los anidados cierran de a uno.
- [ ] Las listas navegables usan flechas, no un tab stop por ítem.
- [ ] Enter confirma la opción resaltada de la lista.
- [ ] Ningún atajo pisa al navegador o al lector de pantalla.
- [ ] Los atajos disponibles están visibles en la pantalla.
- [ ] No hay ninguna trampa de foco fuera de un modal legítimo.
